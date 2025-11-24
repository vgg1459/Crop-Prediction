
// Initialize AOS
AOS.init({ duration: 1200, once: false });

// Back-to-Top Button
var backToTop = document.getElementById("back-to-top");
window.onscroll = function () {
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    backToTop.style.display = "block";
  } else {
    backToTop.style.display = "none";
  }
};
backToTop.addEventListener("click", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Handle Crop Prediction Form Submission
document.getElementById("cropPredictionForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const district = document.getElementById("districtInput").value.trim();
  if (!district) {
    alert("Please enter a district name.");
    return;
  }
  // Clear previous modal content and show loading indicator
  document.getElementById("predictionModalContent").innerHTML = "";
  document.getElementById("loadingIndicator").style.display = "block";
  // POST request to backend API
  fetch("http://127.0.0.1:5000/predict_crop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ district: district })
  })
    .then(response => response.json())
    .then(data => {
      document.getElementById("loadingIndicator").style.display = "none";
      if (data.error) {
        alert(data.error);
      } else {
        const modalContent = document.getElementById("predictionModalContent");
        data.predictions.forEach(item => {
          // Convert crop name to filename (e.g. "Wheat" -> "wheat.jpg")
          let cropFileName = item.crop.toLowerCase().replace(/\s+/g, "_") + ".jpg";
          let imagePath = "assets/images/crops/" + cropFileName;
          const resultItem = document.createElement("div");
          resultItem.className = "result-item";
          const img = document.createElement("img");
          img.src = imagePath;
          img.alt = item.crop;
          img.onerror = function () { this.src = "assets/images/crops/placeholder.jpg"; };
          const cropName = document.createElement("strong");
          cropName.textContent = item.crop;
          resultItem.appendChild(img);
          resultItem.appendChild(cropName);
          modalContent.appendChild(resultItem);
        });
        var predictionModal = new bootstrap.Modal(document.getElementById("predictionModal"));
        predictionModal.show();
      }
    })
    .catch(error => {
      console.error("Error:", error);
      alert("An error occurred while predicting the crop.");
      document.getElementById("loadingIndicator").style.display = "none";
    });
});
