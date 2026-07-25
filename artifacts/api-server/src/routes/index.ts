import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import accountRouter from "./account";
import blogRouter from "./blog";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(accountRouter);
// Blog must be registered before adminRouter — adminRouter applies requireAdmin to
// every request that reaches it, and the blog router serves public routes too.
router.use(blogRouter);
router.use(adminRouter);

export default router;
