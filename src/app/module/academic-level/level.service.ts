import { AcademicLevel } from "../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";

const createAcademicLevel=async(payload:AcademicLevel):Promise<AcademicLevel> =>{
    const level=await prisma.academicLevel.create({
        data:payload
    })
    return level
}

const getAllAcademicLevels=async():Promise<AcademicLevel[]> =>{
    const levels=await prisma.academicLevel.findMany()
    return levels
}

const deleteAcademicLevel=async(id:string):Promise<AcademicLevel> =>{
    const level=await prisma.academicLevel.delete({
        where:{
            id
        }
    })
    return level
}

export const AcademicLevelService={
    createAcademicLevel,
    getAllAcademicLevels,
    deleteAcademicLevel
}