import { connectMongo, disconnectMongo } from '../config/database';
import MerchantModel from '../models/merchant.model';

async function seedMerchant(): Promise<void> {
  await connectMongo();

  const merchant = await MerchantModel.findOneAndUpdate(
    { merchantId: 'merchant-1' },
    { merchantId: 'merchant-1', feePercent: '2.5' },
    { returnDocument: 'after', upsert: true },
  ).lean();

  console.log(`Seeded merchant ${merchant?.merchantId} with feePercent=${merchant?.feePercent}`);
}

seedMerchant()
  .catch((error: unknown) => {
    console.error('Failed to seed merchant', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo();
  });
