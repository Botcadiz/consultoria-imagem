import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Nós vamos preencher isso depois com as chaves que você vai me passar
const supabaseUrl = process.env.SUPABASE_URL || 'sua-url-aqui';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sua-chave-aqui';

export const supabase = createClient(supabaseUrl, supabaseKey);
