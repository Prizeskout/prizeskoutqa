import { verifyOnboardingCapability } from "@/server/onboarding-capability";

export async function verifyMerchantBootstrap(merchantId: string, onboardingToken: string) {
  return Boolean(onboardingToken && verifyOnboardingCapability(onboardingToken, merchantId));
}
