// ================= RUN AFTER PAGE LOAD =================
document.addEventListener("DOMContentLoaded", () => {

  // ================= NAVBAR SMOOTH SCROLL =================
  const navLinks = document.querySelectorAll(".navbar nav a");

  navLinks.forEach(link => {
    link.addEventListener("click", function(e) {
      e.preventDefault();

      const targetId = this.getAttribute("href");
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });

// ================= EXPLORE BUTTON ANIMATION =================
  const btn      = document.getElementById("exploreBtn");
  const house    = document.getElementById("houseImg");
  const heroText = document.querySelector(".hero-text");
  const navbar   = document.querySelector(".navbar");

  if (btn && house) {

    btn.addEventListener("click", () => {

      // Lock button immediately
      btn.style.pointerEvents = "none";

      // Step 1: Fade out text and navbar
      if (heroText) { heroText.style.transition = "opacity 0.3s ease"; heroText.style.opacity = "0"; }
      if (navbar)   { navbar.style.transition   = "opacity 0.3s ease"; navbar.style.opacity   = "0"; }

      // Step 2: Read exact position of image on screen right now
      const r = house.getBoundingClientRect();

      // Step 3: Pin image exactly where it is using fixed positioning
      house.style.position   = "fixed";
      house.style.margin     = "0";
      house.style.padding    = "0";
      house.style.top        = r.top    + "px";
      house.style.left       = r.left   + "px";
      house.style.width      = r.width  + "px";
      house.style.height     = r.height + "px";
      house.style.objectFit  = "cover";
      house.style.zIndex     = "99999";
      house.style.transition = "none";
      house.style.transform  = "none";

      // Step 4: Double rAF — browser MUST paint the pinned state first
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {

          // Expand to full screen over 0.5s
          house.style.transition = "top 0.5s ease, left 0.5s ease, width 0.5s ease, height 0.5s ease";
          house.style.top    = "0px";
          house.style.left   = "0px";
          house.style.width  = "100vw";
          house.style.height = "100vh";

          // Step 5: After full screen → zoom into door
          setTimeout(() => {
            house.style.transition     = "transform 2s ease-in-out";
            house.style.transformOrigin = "55% 35%";
            house.style.transform      = "scale(5)";
          }, 550);

          // Step 6: Navigate after zoom finishes
          setTimeout(() => {
            window.location.href = "listing.html";
          }, 2700);

        });
      });

    });
  }

  // --- Footer Help Form Validation ---
  const helpBtn = document.getElementById('helpSubmitBtn');
  const helpMsg = document.getElementById('helpMsg');

  if (helpBtn && helpMsg) {
    helpBtn.addEventListener('click', () => {
      const msg = helpMsg.value.trim();
      if (!msg) {
        alert("Please type a message before submitting so our support team can help you!");
        helpMsg.focus();
      } else {
        // Mock successful delivery
        alert("Thank you! Your message has been sent to the RentBro support team. We will get back to you shortly.");
        helpMsg.value = "";
      }
    });
  }

});