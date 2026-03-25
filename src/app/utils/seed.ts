import { envVars } from "../../config/env";
import { Role } from "../../generated/prisma/enums";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
  try {
    const isSuperAdmin = await prisma.user.findFirst({
      where: {
        role: Role.SUPER_ADMIN,
      },
    });

    if (isSuperAdmin) {
      return;
    }

    const superAdminUser = await auth.api.signUpEmail({
      body: {
        name: "Super Admin",
        email: envVars.SUPER_ADMIN_EMAIL,
        password: envVars.SUPER_ADMIN_PASSWORD,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: superAdminUser.user.id,
        },
        data: {
          role: Role.SUPER_ADMIN,
          emailVerified: true,
          needPasswordChange: false,
        },
      });
    });

    console.log("Super admin created successfully");
  } catch (error) {
    console.error("Failed to create super admin", error);
    await prisma.user
      .deleteMany({
        where: { email: envVars.SUPER_ADMIN_EMAIL },
      })
      .catch(() => {});
  }
};
