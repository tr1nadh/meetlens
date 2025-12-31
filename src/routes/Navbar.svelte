<script>
  // Helper to handle smooth scrolling for internal links
  function scrollToSection(e, id) {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
</script>

<nav class="navbar navbar-expand-lg fixed-top custom-nav">
  <div class="container">
    <a class="navbar-brand fw-bold" href="/">
      <i class="fa-solid fa-microphone-lines text-indigo me-2"></i>
      MeetLens
    </a>

    <button 
      class="navbar-toggler border-0" 
      type="button" 
      data-bs-toggle="collapse" 
      data-bs-target="#navbarContent"
      aria-controls="navbarContent" 
      aria-expanded="false" 
      aria-label="Toggle navigation"
    >
      <i class="fa-solid fa-bars text-white"></i>
    </button>

    <div class="collapse navbar-collapse" id="navbarContent">
      <ul class="navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3">
        <li class="nav-item">
          <a class="nav-link" href="/#features">Features</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/#how">How it Works</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/#pricing">Pricing</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/#testimonials">Testimonials</a>
        </li>
      </ul>
      
      <div class="d-flex align-items-center gap-3 mt-3 mt-lg-0">
        <a href="/login" class="nav-link p-0 login-link">Login</a>
        <a href="/upload" class="btn btn-indigo-sm px-4">Start Free</a>
      </div>
    </div>
  </div>
</nav>

<style>
  .custom-nav {
    background: rgba(7, 9, 16, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 15px 0;
  }

  .navbar-brand {
    color: #ffffff !important;
    font-size: 1.5rem;
    letter-spacing: -0.5px;
  }

  .text-indigo {
    color: #6366f1;
  }

  .nav-link {
    color: #94a3b8 !important;
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s ease;
  }

  .nav-link:hover {
    color: #ffffff !important;
  }

  .login-link {
    font-size: 0.95rem;
    margin-right: 10px;
  }

  .btn-indigo-sm {
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.9rem;
    padding: 10px 20px;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
    transition: 0.3s;
  }

  .btn-indigo-sm:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
    color: white;
  }

  /* Adjust for mobile menu */
  @media (max-width: 991px) {
    .navbar-collapse {
      background: #0e111d;
      margin-top: 15px;
      padding: 20px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  }
</style>