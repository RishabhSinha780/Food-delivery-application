const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdmVnbWp4b3pqZmd5eWJuc2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTg1NjYsImV4cCI6MjA5MzQ5NDU2Nn0.cj-lQ5H68KZ2-cXgUFlo_eyw9WhIwhjX6IjRBiiI9Kw";

async function run() {
  try {
    const resP = await fetch("https://dpvegmjxozjfgyybnskl.supabase.co/rest/v1/profiles?select=*", {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    console.log("PROFILES:", await resP.json());

    const resR = await fetch("https://dpvegmjxozjfgyybnskl.supabase.co/rest/v1/restaurants?select=*", {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    console.log("RESTAURANTS:", await resR.json());
  } catch (e) {
    console.error(e);
  }
}

run();
