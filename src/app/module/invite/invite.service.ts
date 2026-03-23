/* eslint-disable @typescript-eslint/no-explicit-any */

import { TSendInvitePayload, TAcceptInvitePayload } from "./invite.validation";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { sendEmail } from "../../utils/email";
import { envVars } from "../../../config/env";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { InviteRole, Role } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";

const sendInvite = async (userId: string, role: string, payload: TSendInvitePayload) => {
  const { email, role: inviteRole, departmentId } = payload;

  // 1. Find current admin
  const currentAdmin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!currentAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  // 2. Only Owner Admin or Super Admin can send invites
  if (role !== Role.SUPER_ADMIN && !currentAdmin.isOwner) {
    throw new AppError(status.FORBIDDEN, "Only the owner admin can send invites");
  }

  // 3. Check if email already registered
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(status.CONFLICT, "This email is already registered");
  }

  // 4. Check if invite already sent to this email (pending)
  const existingInvite = await prisma.invite.findFirst({
    where: {
      email,
      used: false,
      isDeleted: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    throw new AppError(status.CONFLICT, "An active invite already exists for this email");
  }

  // 5. If DEPARTMENT_HEAD, verify department exists and belongs to university
  if (inviteRole === InviteRole.DEPARTMENT_HEAD && departmentId) {
    const department = await prisma.department.findFirst({
      where: {
        id: departmentId,
        universityId: currentAdmin.universityId,
        isDeleted: false,
      },
    });

    if (!department) {
      throw new AppError(status.NOT_FOUND, "Department not found in your university");
    }

    // Check if department already has an active head
    const existingHead = await prisma.departmentHead.findFirst({
      where: {
        departmentId,
        isDeleted: false,
      },
    });

    if (existingHead) {
      throw new AppError(
        status.CONFLICT,
        "This department already has an active Department Head",
      );
    }
  }

  // 6. Generate unique token
  const token = crypto.randomBytes(32).toString("hex");

  // 7. Create invite record
  const invite = await prisma.invite.create({
    data: {
      email,
      role: inviteRole,
      universityId: currentAdmin.universityId,
      invitedByUserId: userId,
      departmentId: departmentId || null,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    include: {
      university: {
        select: { id: true, name: true },
      },
      department: {
        select: { id: true, name: true },
      },
    },
  });

  // 8. Get admin's name for email
  const adminUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  // 9. Send invite email
  const inviteUrl = `${envVars.FRONTEND_URL}/accept-invite?token=${token}`;

  sendEmail({
    to: email,
    subject: `You're invited to join ${invite.university.name} — ScholarTrack`,
    templateName: "invite",
    templateData: {
      email,
      universityName: invite.university.name,
      roleName:
        inviteRole === InviteRole.DEPARTMENT_HEAD
          ? "Department Head"
          : "Committee Reviewer",
      departmentName: invite.department?.name || "N/A",
      invitedByName: adminUser?.name || "Admin",
      inviteUrl,
      expiresIn: "7 days",
    },
  }).catch((err) => console.error("Invite email failed:", err.message));

  return invite;
};

const acceptInvite = async (payload: TAcceptInvitePayload) => {
  const { token, name, password, phone, designation } = payload;

  // 1. Find invite by token
  const invite = await prisma.invite.findFirst({
    where: {
      token,
      used: false,
      isDeleted: false,
    },
    include: {
      university: {
        select: { id: true, name: true },
      },
      department: {
        select: { id: true, name: true },
      },
    },
  });

  if (!invite) {
    throw new AppError(status.NOT_FOUND, "Invalid or expired invite");
  }

  // 2. Check if expired
  if (new Date() > invite.expiresAt) {
    throw new AppError(status.BAD_REQUEST, "This invite has expired");
  }

  // 3. Check if email already registered
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  if (existingUser) {
    throw new AppError(status.CONFLICT, "This email is already registered");
  }

  // 4. Map InviteRole to Role
  const userRole =
    invite.role === InviteRole.DEPARTMENT_HEAD
      ? Role.DEPARTMENT_HEAD
      : Role.COMMITTEE_REVIEWER;

  // 5. Create User via better-auth
  const data = await auth.api.signUpEmail({
    body: {
      name,
      email: invite.email,
      password,
    },
  });

  if (!data.user) {
    throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to create user");
  }

  // 6. Transaction — set role + create profile + mark invite used
  const result = await prisma
    .$transaction(async (tx) => {
      // Set correct role
      await tx.user.update({
        where: { id: data.user.id },
        data: { role: userRole },
      });

      // Create role-specific profile
      let profile;

      if (invite.role === InviteRole.DEPARTMENT_HEAD) {
        profile = await tx.departmentHead.create({
          data: {
            userId: data.user.id,
            universityId: invite.universityId,
            departmentId: invite.departmentId!,
            phone,
            designation,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            university: {
              select: { id: true, name: true },
            },
            department: {
              select: { id: true, name: true },
            },
          },
        });
      } else {
        profile = await tx.reviewer.create({
          data: {
            userId: data.user.id,
            universityId: invite.universityId,
            phone,
            designation,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            university: {
              select: { id: true, name: true },
            },
          },
        });
      }

      // Mark invite as used
      await tx.invite.update({
        where: { id: invite.id },
        data: { used: true },
      });

      return profile;
    })
    .catch(async (err: any) => {
      // Rollback — delete created user
      await prisma.user.delete({ where: { id: data.user.id } }).catch(() => {});
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `Failed to accept invite: ${err.message}`,
      );
    });

  return result;
};

const getAllInvites = async (userId: string, role: string) => {
  if (role === Role.SUPER_ADMIN) {
    return await prisma.invite.findMany({
      where: { isDeleted: false },
      include: {
        university: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const currentAdmin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!currentAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  return await prisma.invite.findMany({
    where: {
      universityId: currentAdmin.universityId,
      isDeleted: false,
    },
    include: {
      university: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

const cancelInvite = async (userId: string, role: string, inviteId: string) => {
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, isDeleted: false },
  });

  if (!invite) {
    throw new AppError(status.NOT_FOUND, "Invite not found");
  }

  if (invite.used) {
    throw new AppError(status.BAD_REQUEST, "This invite has already been used");
  }

  // Permission check
  if (role !== Role.SUPER_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    if (!currentAdmin.isOwner) {
      throw new AppError(status.FORBIDDEN, "Only the owner admin can cancel invites");
    }

    if (invite.universityId !== currentAdmin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only cancel invites from your university",
      );
    }
  }

  const result = await prisma.invite.update({
    where: { id: inviteId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return result;
};

export const InviteService = {
  sendInvite,
  acceptInvite,
  getAllInvites,
  cancelInvite,
};
