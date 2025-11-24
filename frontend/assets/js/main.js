
// Initialize AOS
AOS.init({
  duration: 1200,
  once: false,
});

// Initialize particles.js for the hero background
particlesJS("particles-js", {
  "particles": {
    "number": {
      "value": 80,
      "density": { "enable": true, "value_area": 800 }
    },
    "color": { "value": "#ffffff" },
    "shape": {
      "type": "circle",
      "stroke": { "width": 0, "color": "#000000" },
      "polygon": { "nb_sides": 5 }
    },
    "opacity": {
      "value": 0.5,
      "random": false,
      "anim": { "enable": false }
    },
    "size": {
      "value": 3,
      "random": true,
      "anim": { "enable": false }
    },
    "line_linked": {
      "enable": true,
      "distance": 150,
      "color": "#ffffff",
      "opacity": 0.4,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 6,
      "direction": "none",
      "random": false,
      "straight": false,
      "out_mode": "out",
      "bounce": false
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": { "enable": true, "mode": "repulse" },
      "onclick": { "enable": true, "mode": "push" },
      "resize": true
    },
    "modes": {
      "grab": { "distance": 400, "line_linked": { "opacity": 1 } },
      "bubble": { "distance": 400, "size": 40, "duration": 2, "opacity": 8, "speed": 3 },
      "repulse": { "distance": 200, "duration": 0.4 },
      "push": { "particles_nb": 4 },
      "remove": { "particles_nb": 2 }
    }
  },
  "retina_detect": true
});

// Initialize Typed.js for the hero heading
var typed = new Typed(".typed-text", {
  strings: [
    "Grow with confidence",
    "Unlock predictive insights",
    "Empowering Agriculture"
  ],
  typeSpeed: 60,
  backSpeed: 30,
  loop: true
});

// Back-to-Top Button functionality
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
