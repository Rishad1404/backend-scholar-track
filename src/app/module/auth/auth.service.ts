import { UserStatus } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";

interface IRegisterStudentPayload{
    name:string,
    email:string,
    password:string
}

const registerStudent=async(payload:IRegisterStudentPayload)=>{
    const {name,email,password}=payload

    const data=await auth.api.signUpEmail({
        body:{
            name,
            email,
            password
        }
    })

    if(!data.user){
        throw new Error("Failed to register student")
    }

    //TODO:Create student after sign up
    // const student=prisma.$transaction(async(tx)=>{
    //     await tx.
    // })

    return data;
}

const loginUser=async(payload:IRegisterStudentPayload)=>{
    const {email,password}=payload
    const data=await auth.api.signInEmail({
        body:{
            email,
            password
        }
    })
    if(data.user.status===UserStatus.BANNED){
        throw new Error("User is banned")
    }

    if(data.user.isDeleted || data.user.status===UserStatus.DELETED){
        throw new Error("User is deleted")
    }

    return data;
}

export const AuthService={
    registerStudent,
    loginUser
}