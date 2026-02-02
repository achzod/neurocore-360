import * as fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

async function uploadBloodTest() {
  const form = new FormData();

  form.append("file", fs.createReadStream("data/CR_195452.pdf"));
  form.append("email", "test@neurocore.com");
  form.append("prenom", "Test");
  form.append("nom", "User");
  form.append("gender", "male");
  form.append("dob", "1990-01-01");
  form.append("poids", "75");
  form.append("taille", "180");

  console.log("📤 Uploading blood test PDF...");

  const response = await fetch("http://localhost:5000/api/blood-tests/upload", {
    method: "POST",
    headers: {
      "x-admin-key": "Badboy007",
    },
    body: form,
  });

  const data = await response.json();
  console.log("\n✅ Response:", JSON.stringify(data, null, 2));

  if (data.id) {
    console.log(`\n🔗 Report URL: http://localhost:5000/analysis/${data.id}?key=Badboy007`);
  }
}

uploadBloodTest().catch(console.error);
