import { AcademicTerm } from "../../../generated/prisma/client"
import { prisma } from "../../../lib/prisma"


const createAcademicTerm=async(payload:AcademicTerm):Promise<AcademicTerm> =>{
    const term=await prisma.academicTerm.create({
        data:payload
    })
    return term
}

const getAllAcademicTerms=async():Promise<AcademicTerm[]> =>{
    const terms=await prisma.academicTerm.findMany()
    return terms
}

const deleteAcademicTerm=async(id:string):Promise<AcademicTerm> =>{
    const term=await prisma.academicTerm.delete({
        where:{
            id
        }
    })
    return term
}

export const AcademicTermService={
    createAcademicTerm,
    getAllAcademicTerms,
    deleteAcademicTerm
}