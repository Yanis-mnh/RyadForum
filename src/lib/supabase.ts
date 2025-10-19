import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://pshhgotjudivrrjdpalg.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaGhnb3RqdWRpdnJyamRwYWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjE0MzYsImV4cCI6MjA3NjQzNzQzNn0.B9caMumYBRHq01CGvHI3VBUaj19CBmqp5-1TIXBSLJ0";
const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
