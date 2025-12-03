import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables before any tests run
dotenv.config({ path: resolve(__dirname, '.env') });
