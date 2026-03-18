import { UserStatus } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

interface IRegisterStudentPayload {
  name: string;
  email: string;
  password: string;
}

const registerStudent = async (payload: IRegisterStudentPayload) => {
  const { name, email, password } = payload;

  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  if (!data.user) {
    throw new Error("Failed to register student");
  }

  //-------------------------------------------------------------Create student after sign up
  try {
    const student = await prisma.$transaction(async (tx) => {
      const studentTx = await tx.student.create({
        data: {
          userId: data.user.id,
          name: payload.name,
          email: payload.email,
        },
      });
      return studentTx;
    });

    return {
      ...data,
      student,
    };
  } catch (error) {
    console.log("Transaction error", error);
    await prisma.user.delete({
      where: {
        id: data.user.id,
      },
    });
    throw error;
  }
};


// -------------------------------------------------------------------------LOGIN USER
const loginUser = async (payload: IRegisterStudentPayload) => {
  const { email, password } = payload;
  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });
  if (data.user.status === UserStatus.BANNED) {
    throw new Error("User is banned");
  }

  if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
    throw new Error("User is deleted");
  }

  return data;
};

export const AuthService = {
  registerStudent,
  loginUser,
};
