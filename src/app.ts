import express,{ Application, Request, Response } from "express";
import { prisma } from "./lib/prisma";


const app:Application=express()

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

// Basic route
app.get('/', async(req: Request, res: Response) => {
  const level=await prisma.academicLevel.create({
    data:{
      name:"Level 4"
    }
  })
  res.status(201).json({
    success:true,
    message:"API is working",
    data:level
  })
});

export default app
