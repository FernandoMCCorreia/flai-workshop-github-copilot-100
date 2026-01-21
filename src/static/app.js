// Translations
const translations = {
  en: {
    schoolName: "Mergington High School",
    pageTitle: "Extracurricular Activities",
    availableActivities: "Available Activities",
    loadingActivities: "Loading activities...",
    signUpTitle: "Sign Up for an Activity",
    studentEmail: "Student Email:",
    emailPlaceholder: "your-email@mergington.edu",
    selectActivity: "Select Activity:",
    selectActivityOption: "-- Select an activity --",
    signUpButton: "Sign Up",
    schedule: "Schedule:",
    availability: "Availability:",
    spotsLeft: "spots left",
    currentParticipants: "Current Participants",
    noParticipants: "No participants yet. Be the first to sign up!",
    removeParticipant: "Remove participant",
    confirmRemove: "Are you sure you want to remove",
    from: "from",
    failedToLoad: "Failed to load activities. Please try again later.",
    failedToSignUp: "Failed to sign up. Please try again.",
    failedToUnregister: "Failed to unregister. Please try again."
  },
  pt: {
    schoolName: "Escola Secundária Mergington",
    pageTitle: "Atividades Extracurriculares",
    availableActivities: "Atividades Disponíveis",
    loadingActivities: "Carregando atividades...",
    signUpTitle: "Inscrever-se em uma Atividade",
    studentEmail: "E-mail do Aluno:",
    emailPlaceholder: "seu-email@mergington.edu",
    selectActivity: "Selecionar Atividade:",
    selectActivityOption: "-- Selecione uma atividade --",
    signUpButton: "Inscrever-se",
    schedule: "Horário:",
    availability: "Disponibilidade:",
    spotsLeft: "vagas restantes",
    currentParticipants: "Participantes Atuais",
    noParticipants: "Ainda não há participantes. Seja o primeiro a se inscrever!",
    removeParticipant: "Remover participante",
    confirmRemove: "Tem certeza de que deseja remover",
    from: "de",
    failedToLoad: "Falha ao carregar atividades. Por favor, tente novamente mais tarde.",
    failedToSignUp: "Falha ao inscrever. Por favor, tente novamente.",
    failedToUnregister: "Falha ao cancelar inscrição. Por favor, tente novamente."
  }
};

// Current language
let currentLang = localStorage.getItem('language') || 'en';

// Translation function
function t(key) {
  return translations[currentLang][key] || key;
}

// Update all translatable elements
function updateTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.placeholder = t(key);
  });

  // Update HTML lang attribute
  document.documentElement.lang = currentLang;

  // Update language toggle button
  const langToggle = document.getElementById('current-lang');
  if (langToggle) {
    langToggle.textContent = currentLang === 'en' ? '🇺🇸 EN' : '🇧🇷 PT';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const languageToggle = document.getElementById("language-toggle");

  // Initialize translations
  updateTranslations();

  // Language toggle handler
  languageToggle.addEventListener("click", () => {
    currentLang = currentLang === 'en' ? 'pt' : 'en';
    localStorage.setItem('language', currentLang);
    updateTranslations();
    // Refresh activities to update dynamic content
    fetchActivities();
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear and reset activity select options
      activitySelect.innerHTML = `<option value="">${t('selectActivityOption')}</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Create participants list HTML
        let participantsHTML = '';
        if (details.participants.length > 0) {
          const participantItems = details.participants
            .map(email => `
              <li>
                <span class="participant-email">${email}</span>
                <button class="delete-btn" data-activity="${name}" data-email="${email}" title="${t('removeParticipant')}">🗑️</button>
              </li>
            `)
            .join('');
          participantsHTML = `
            <div class="participants-section">
              <h5>${t('currentParticipants')} (${details.participants.length}):</h5>
              <ul class="participants-list">
                ${participantItems}
              </ul>
            </div>
          `;
        } else {
          participantsHTML = `
            <div class="participants-section">
              <h5>${t('currentParticipants')}:</h5>
              <p class="no-participants">${t('noParticipants')}</p>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>${t('schedule')}</strong> ${details.schedule}</p>
          <p><strong>${t('availability')}</strong> ${spotsLeft} ${t('spotsLeft')}</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = `<p>${t('failedToLoad')}</p>`;
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        
        // Refresh activities list
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = t('failedToSignUp');
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle participant deletion
  activitiesList.addEventListener("click", async (event) => {
    if (event.target.classList.contains("delete-btn")) {
      const activity = event.target.dataset.activity;
      const email = event.target.dataset.email;

      if (!confirm(`${t('confirmRemove')} ${email} ${t('from')} ${activity}?`)) {
        return;
      }

      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
          {
            method: "DELETE",
          }
        );

        const result = await response.json();

        if (response.ok) {
          messageDiv.textContent = result.message;
          messageDiv.className = "success";
          messageDiv.classList.remove("hidden");

          // Refresh activities list
          await fetchActivities();

          // Hide message after 5 seconds
          setTimeout(() => {
            messageDiv.classList.add("hidden");
          }, 5000);
        } else {
          messageDiv.textContent = result.detail || "An error occurred";
          messageDiv.className = "error";
          messageDiv.classList.remove("hidden");
        }
      } catch (error) {
        messageDiv.textContent = t('failedToUnregister');
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        console.error("Error unregistering:", error);
      }
    }
  });

  // Initialize app
  fetchActivities();
});
