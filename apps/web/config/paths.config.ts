import { z } from 'zod';

const PathsSchema = z.object({
  auth: z.object({
    signIn: z.string().min(1),
    signUp: z.string().min(1),
    verifyMfa: z.string().min(1),
    callback: z.string().min(1),
    passwordReset: z.string().min(1),
    passwordUpdate: z.string().min(1),
  }),
  app: z.object({
    home: z.string().min(1),
    profileSettings: z.string().min(1),
    csvDashboard: z.string().min(1),
    dataSection: z.string().min(1),
    chatbot: z.string().min(1),
    AMDEC: z.string().min(1),
    otCreator: z.string().min(1),
    breakdownPrediction: z.string().min(1),
    maintenancePlan: z.string().min(1),
  }),
});

const pathsConfig = PathsSchema.parse({
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    verifyMfa: '/auth/verify',
    callback: '/auth/callback',
    passwordReset: '/auth/password-reset',
    passwordUpdate: '/update-password',
  },
  app: {
    home: '/home',
    profileSettings: '/home/settings',
    csvDashboard: '/home/csv-dashboard',
    dataSection: '/home/DataManagement',
    chatbot: '/home/chatbot',
    AMDEC: '/home/AMDEC',
    otCreator: '/home/OT-creator',
    breakdownPrediction: '/home/breakdown-prediction',
    maintenancePlan: '/home/maintenance/plan',
  },
} satisfies z.infer<typeof PathsSchema>);

export default pathsConfig;
