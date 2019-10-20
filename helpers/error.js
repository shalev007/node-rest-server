exports.throwError = (message, status, data = null) => {
    const error = new Error(message);
    error.statusCode = status;
    if (data) {
        error.data = data;
    }
    throw error;
};

exports.catchError = (error, next) => {
    error.statusCode = error.statusCode || 500;
    next(error);
};