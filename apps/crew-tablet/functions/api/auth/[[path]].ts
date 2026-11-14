import { handleGoogleAuth, type GoogleEnv } from "../../../server/google";

export const onRequest = ({ request, env }: { request: Request; env: GoogleEnv }) =>
  handleGoogleAuth(request, env);
