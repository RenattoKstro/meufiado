import serverless from "serverless-http";
import { createApiApp } from "../../server/_core/apiApp";

const app = createApiApp();
export const handler = serverless(app);
