//  const asyncHandler = (func) => async(req,res,next)=>{
//      try {
//         await func(req,res,next);
//      } catch (error) {
//         res.status(500).json({
//            success : false,
//            message : error.message,
//         })

//      }
//  }

const asyncHandler = (func) => {
    async (req, res, next) => {
    Promise.resolve(func(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
