import { z } from "zod";

/** Account deletion (Settings): the current password plus typing DELETE. */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password").max(200, "Enter your password"),
  confirm: z
    .string()
    .trim()
    .refine((v) => v === "DELETE", "Type DELETE in capitals to confirm"),
});
