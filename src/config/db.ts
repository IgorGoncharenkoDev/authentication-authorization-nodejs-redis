import mongoose from 'mongoose';
import { chalkError, chalkSuccess } from '@/config/chalk';

export async function connect() {
  try {
    await mongoose.connect(process.env.MONGO_URL!);
    console.log(chalkSuccess('Mongodb connected successfully!'));
  } catch (err) {
    console.error(chalkError('Mongodb connection error...'));
    process.exit(1);
  }
}