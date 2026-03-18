class AppError extends Error {
    public statusCode: number;

    constructor(statusCode: number, message: string, stack = '') {
        super(message); // Call the parent constructor with the message
        this.statusCode = statusCode;
        if(stack) {
            this.stack = stack; // Set the stack trace if provided
        }else{
            Error.captureStackTrace(this, this.constructor); // Capture the stack trace
        }
    }
}

export default AppError;