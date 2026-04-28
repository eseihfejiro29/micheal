(function () {
  const STORAGE_KEYS = {
    users: "marriagegist_users",
    currentUser: "marriagegist_current_user",
    messages: "marriagegist_contact_messages"
  };

  const AUTH_PAGES = ["login.html", "signup.html"];

  document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    setupNavigation();
    setupAuth(currentPage);
    setupForms();
    setupScrollReveal();
    setupCursor();
  });

  function setupNavigation() {
    const nav = document.getElementById("siteNav");
    const navToggle = document.getElementById("navToggle");

    if (!nav || !navToggle) {
      return;
    }

    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("menu-open", isOpen);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
      }
    });
  }

  function setupAuth(currentPage) {
    const currentUser = getCurrentUser();

    if (!AUTH_PAGES.includes(currentPage) && !currentUser) {
      window.location.href = "login.html";
      return;
    }

    if (AUTH_PAGES.includes(currentPage) && currentUser) {
      window.location.href = "index.html";
      return;
    }

    // Swap login action for logout when a user is signed in.
    document.querySelectorAll(".auth-link").forEach((link) => {
      if (currentUser) {
        link.textContent = "Logout";
        link.href = "#";
        link.addEventListener("click", (event) => {
          event.preventDefault();
          localStorage.removeItem(STORAGE_KEYS.currentUser);
          window.location.href = "login.html";
        });
      } else {
        link.textContent = "Login";
        link.href = "login.html";
      }
    });
  }

  function setupForms() {
    setupSignupForm();
    setupLoginForm();
    setupContactForm();
  }

  function setupSignupForm() {
    const signupForm = document.getElementById("signupForm");

    if (!signupForm) {
      return;
    }

    signupForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = document.getElementById("signupName").value.trim();
      const email = document.getElementById("signupEmail").value.trim().toLowerCase();
      const password = document.getElementById("signupPassword").value;
      const confirmPassword = document.getElementById("signupConfirm").value;
      const status = document.getElementById("signupStatus");

      if (password !== confirmPassword) {
        status.textContent = "Passwords do not match.";
        return;
      }

      const users = getUsers();
      const existingUser = users.find((user) => user.email === email);

      if (existingUser) {
        status.textContent = "An account with that email already exists.";
        return;
      }

      users.push({
        name,
        email,
        password,
        createdAt: new Date().toISOString()
      });

      localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
      status.textContent = "Account created successfully. Redirecting to login...";
      signupForm.reset();

      setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
    });
  }

  function setupLoginForm() {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
      return;
    }

    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const email = document.getElementById("loginEmail").value.trim().toLowerCase();
      const password = document.getElementById("loginPassword").value;
      const status = document.getElementById("loginStatus");
      const users = getUsers();
      const matchedUser = users.find((user) => user.email === email && user.password === password);

      if (!matchedUser) {
        status.textContent = "Invalid email or password.";
        return;
      }

      localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(matchedUser));
      status.textContent = "Login successful. Redirecting...";
      loginForm.reset();

      setTimeout(() => {
        window.location.href = "index.html";
      }, 700);
    });
  }

  function setupContactForm() {
    const contactForm = document.getElementById("contactForm");

    if (!contactForm) {
      return;
    }

    const emailjsConfig = window.MARRIAGEGIST_EMAILJS_CONFIG || {};
    const currentUser = getCurrentUser();
    const nameInput = document.getElementById("contactName");
    const emailInput = document.getElementById("contactEmail");
    const status = document.getElementById("contactStatus");
    const submitButton = document.getElementById("contactSubmitBtn");

    if (currentUser && nameInput && !nameInput.value) {
      nameInput.value = currentUser.name || "";
    }

    if (currentUser && emailInput && !emailInput.value) {
      emailInput.value = currentUser.email || "";
    }

    if (window.emailjs && emailjsConfig.publicKey && emailjsConfig.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY") {
      window.emailjs.init({
        publicKey: emailjsConfig.publicKey
      });
    }

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const message = document.getElementById("contactMessage").value.trim();

      if (!name || !email || !message) {
        status.textContent = "Please fill in your name, email, and message.";
        return;
      }

      if (!isValidEmail(email)) {
        status.textContent = "Please enter a valid email address.";
        return;
      }

      if (!window.emailjs) {
        status.textContent = "Email service failed to load. Please refresh and try again.";
        return;
      }

      if (
        !emailjsConfig.publicKey ||
        !emailjsConfig.serviceId ||
        !emailjsConfig.templateId ||
        emailjsConfig.publicKey === "YOUR_EMAILJS_PUBLIC_KEY" ||
        emailjsConfig.serviceId === "YOUR_EMAILJS_SERVICE_ID" ||
        emailjsConfig.templateId === "YOUR_EMAILJS_TEMPLATE_ID"
      ) {
        status.textContent = "EmailJS is not configured yet. Add your Public Key, Service ID, and Template ID first.";
        return;
      }

      const templateParams = {
        subject: "New Message from Love Doctor Contact Form",
        from_name: name,
        reply_to: email,
        email,
        message,
        to_email: emailjsConfig.ownerEmail || "florence42@gmail.com"
      };

      setContactSendingState(submitButton, true);
      status.textContent = "Sending message...";

      window.emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, templateParams).then(() => {
        status.textContent = "Message sent successfully";
        contactForm.reset();

        if (currentUser) {
          nameInput.value = currentUser.name || "";
          emailInput.value = currentUser.email || "";
        }
      }).catch((error) => {
        const details = error && (error.text || error.message || error.status);
        console.error("EmailJS send failed:", error);
        status.textContent = details
          ? `Message failed to send: ${details}`
          : "Message failed to send. Please try again.";
      }).finally(() => {
        setContactSendingState(submitButton, false);
      });

    });
  }

  function setContactSendingState(button, isSending) {
    if (!button) {
      return;
    }

    button.disabled = isSending;
    button.classList.toggle("is-loading", isSending);
    button.textContent = isSending ? "Sending..." : "Send Message";
  }

  function setupScrollReveal() {
    const revealItems = document.querySelectorAll("[data-reveal]");

    if (!revealItems.length) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.16
    });

    revealItems.forEach((item) => observer.observe(item));
  }

  function setupCursor() {
    if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 760) {
      return;
    }

    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    document.body.append(dot, ring);

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;

    const interactiveSelector = "a, button, input, textarea, label, .button, .event-card, .gallery-card";

    window.addEventListener("mousemove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      dot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
    });

    document.querySelectorAll(interactiveSelector).forEach((element) => {
      element.addEventListener("mouseenter", () => {
        document.body.classList.add("cursor-hover");
      });

      element.addEventListener("mouseleave", () => {
        document.body.classList.remove("cursor-hover");
      });
    });

    const animateRing = () => {
      ringX += (targetX - ringX) * 0.16;
      ringY += (targetY - ringY) * 0.16;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateRing);
    };

    animateRing();
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || "[]");
  }

  function getCurrentUser() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser) || "null");
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
})();
