import app from "./app";
import { seedSuperAdmin } from "./app/utils/seed";
import { envVars } from "./config/env";


const bootstrap=async ()=>{
    try {
        await seedSuperAdmin();
        app.listen(envVars.PORT, () => {
            console.log(`Server is running on http://localhost:${envVars.PORT}`);
        })
    } catch (error) {
        console.error("Error starting the server:", error);
    }
}

bootstrap()