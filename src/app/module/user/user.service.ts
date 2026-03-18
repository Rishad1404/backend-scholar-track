
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { TRegisterUniversityAdminPayload } from "./user.validation";

const registerUniversityAdmin = async (
  payload: TRegisterUniversityAdminPayload
) => {
  const { name, email, password, universityName, website, phone, designation } =
    payload;

  // 1. Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  // 2. Check if university name already taken
  const existingUniversity = await prisma.university.findFirst({
    where: { name: universityName, isDeleted: false },
  });

  if (existingUniversity) {
    throw new Error("University with this name already exists");
  }

  // 3. Create User via better-auth
  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      role: "UNIVERSITY_ADMIN",
    },
  });

  if (!data.user) {
    throw new Error("Failed to create user");
  }

  // 4. Create University + Admin profile in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const university = await tx.university.create({
      data: {
        name: universityName,
        website,
      },
    });

    const admin = await tx.admin.create({
      data: {
        userId: data.user.id,
        universityId: university.id,
        name,
        email,
        phone,
        designation,
        isOwner: true,
      },
    });

    return { university, admin };
  });

  return {
    token: data.token,
    user: data.user,
    university: result.university,
    admin: result.admin,
  };
};

export const UserService = {
  registerUniversityAdmin,
};