<script>
  import { user } from '$lib/store';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  // Extract supabase client from the page data to handle logout
  $: ({ supabase } = $page.data);

  function scrollToSection(e, id) {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {

      if (supabase) {
        const { error } = await supabase.auth.signOut();
        $user = null;
        if (error) console.error('Logout error:', error.message);
        // The user store will be cleared by your onAuthStateChange in +layout.svelte
        window.location.href = '/';
      }
    }
  }

  // Use the auto-subscription $ syntax for the store instead of manual subscribe/unsubscribe
  // This is cleaner and prevents memory leaks
  $: loggedInUser = $user;
  console.log("Navbar - loggedInUser:", loggedInUser);
</script>

<nav class="navbar navbar-expand-lg fixed-top custom-nav">
  <div class="container">
    <a class="navbar-brand fw-bold" href="/">
      <i class="fa-solid fa-microphone-lines text-indigo me-2"></i>
      Meetlens AI
    </a>

    <button 
      class="navbar-toggler border-0" 
      type="button" 
      data-bs-toggle="collapse" 
      data-bs-target="#navbarContent"
    >
      <i class="fa-solid fa-bars text-white"></i>
    </button>

    <div class="collapse navbar-collapse" id="navbarContent">
      <ul class="navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3">
        <li class="nav-item"><a class="nav-link" href="/#features">Features</a></li>
        <li class="nav-item"><a class="nav-link" href="/#how">How it Works</a></li>
        <li class="nav-item"><a class="nav-link" href="/#pricing">Pricing</a></li>
        <li class="nav-item"><a class="nav-link" href="/#testimonials">Testimonials</a></li>
      </ul>
      
      <div class="d-flex align-items-center gap-3 mt-3 mt-lg-0">
        {#if loggedInUser}
          <div class="dropdown">
            <button class="btn user-dropdown-btn dropdown-toggle shadow-none" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              {#if loggedInUser.user_metadata?.avatar_url}
                <img src={loggedInUser.user_metadata.avatar_url} alt="Profile" class="avatar-img me-2" />
              {:else}
                <i class="fa-solid fa-user-circle me-2"></i>
              {/if}
              <span class="d-none d-sm-inline">{loggedInUser.user_metadata?.full_name || 'User'}</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end custom-dropdown">
              <li class="dropdown-header border-bottom border-secondary pb-2 mb-2">
                <div class="small text-muted">Email</div>
                <div class="text-white text-truncate" style="max-width: 180px;">{loggedInUser.email}</div>
              </li>
              <li><a class="dropdown-item" href="/upload">Upload</a></li>
              <li><hr class="dropdown-divider border-secondary"></li>
              <li><button class="dropdown-item text-danger" on:click={handleLogout}>Logout</button></li>
            </ul>
          </div>
        {:else}
          <a href="/login" class="nav-link p-0 login-link">Login</a>
        {/if}
        
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

  .text-indigo { color: #6366f1; }

  .nav-link {
    color: #94a3b8 !important;
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s ease;
  }

  .nav-link:hover { color: #ffffff !important; }

  .login-link {
    font-size: 0.95rem;
    margin-right: 10px;
  }

  /* User Dropdown Button */
  .user-dropdown-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    border-radius: 12px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
  }

  .user-dropdown-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .avatar-img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }

  .custom-dropdown {
    background: #111420;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 10px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  }

  .dropdown-item {
    border-radius: 8px;
    padding: 8px 16px;
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