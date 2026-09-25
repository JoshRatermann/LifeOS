const SUPABASE_URL = "https://kezskesguutvkzkgbmto.supabase.co";
const SUPABASE_KEY = "sb_publishable_Nfptf1zo2bBteS4eHDMn7g_u1g6loSt";
const USER_ID = "7ddde65a-d770-4682-be2d-86ac7e4b2a52";

let currentTask = null;
let selectedDueDate = null;
let selectedTimeHorizon = "none";
let selectedAvailableMinutes = 30;
let selectedEnergyLevel = "normal";
let currentRoutine = null;

async function callSupabase(functionName, body) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return await response.json();
}


// =========================
// GET NEXT TASK
// =========================

async function getNextTask() {
  try {

    // Make sure any due recurring tasks become normal tasks first
    await callSupabase(
      "process_recurring_tasks",
      {
        p_user_id: USER_ID
      }
    );

    const result = await callSupabase(
      "get_next_task",
      {
        p_user_id: USER_ID,
        p_available_minutes:
          selectedAvailableMinutes || 30,
        p_energy_level:
          selectedEnergyLevel || "normal",
        p_minimum_day: false
      }
    );

    if (!result || result.length === 0) {
      showNoTasks();
      return;
    }

    currentTask = result[0];

    document.getElementById("task-title").textContent =
      currentTask.title;

    document.getElementById("task-category").textContent =
      currentTask.category || "General";

    document.getElementById("task-time").textContent =
      `${currentTask.estimated_minutes || 0} minutes`;

    document.getElementById("task-reason").textContent =
      currentTask.reason || "";

  } catch (error) {

    console.error("GET NEXT TASK ERROR:", error);

    document.getElementById("task-title").textContent =
      "Something went wrong";

    document.getElementById("task-reason").textContent =
      error.message;
  }
}


function showNoTasks() {
  currentTask = null;

  document.getElementById("task-title").textContent =
    "You're all caught up!";

  document.getElementById("task-category").textContent =
    "";

  document.getElementById("task-time").textContent =
    "";

  document.getElementById("task-reason").textContent =
    "Nothing needs your attention right now.";
}


// =========================
// COMPLETE TASK
// =========================

async function completeCurrentTask() {
  if (!currentTask) return;

  try {

    const result =
      await callSupabase(
        "complete_task",
        {
          p_user_id: USER_ID,
          p_task_id: currentTask.task_id
        }
      );

    if (result !== true) {
      throw new Error(
        "The task was not marked as completed."
      );
    }

    currentTask = null;

    await getNextTask();

  } catch (error) {

    console.error(
      "COMPLETE TASK ERROR:",
      error
    );

    alert(
      "I couldn't mark that task as complete: " +
      error.message
    );
  }
}


// =========================
// SKIP TASK
// =========================

function openSkipModal() {
  if (!currentTask) return;

  document
    .getElementById("skip-modal")
    .classList.remove("hidden");
}


function closeSkipModal() {
  document
    .getElementById("skip-modal")
    .classList.add("hidden");
}


async function skipCurrentTask(reason) {
  if (!currentTask) return;

  try {

    await callSupabase(
      "skip_task",
      {
        p_user_id: USER_ID,
        p_task_id: currentTask.task_id,
        p_reason: reason,
        p_available_minutes:
          selectedAvailableMinutes || 30,
        p_energy_level:
          selectedEnergyLevel || "normal"
      }
    );

    closeSkipModal();

    await getNextTask();

  } catch (error) {

    console.error(error);

    alert(
      "I couldn't reschedule that task."
    );
  }
}


// =========================
// OPEN ADD TASK MODAL
// =========================

function openAddModal() {

  selectedDueDate = null;
  selectedTimeHorizon = null;

  document
    .querySelectorAll(".due-button")
    .forEach(button => {
      button.classList.remove("selected");
    });

  document
    .getElementById("add-task-modal")
    .classList.remove("hidden");

  document
    .getElementById("title-input")
    .focus();
}


function closeAddModal() {

  document
    .getElementById("add-task-modal")
    .classList.add("hidden");

  document
    .getElementById("title-input")
    .value = "";

  selectedDueDate = null;
  selectedTimeHorizon = null;

}


function formatDate(date) {

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function chooseDueDate(option) {

  const today =
    new Date();

  selectedDueDate = null;
  selectedTimeHorizon = "none";

  if (option === "today") {

    selectedDueDate =
      formatDate(today);

    selectedTimeHorizon =
      "today";
  }

  if (option === "tomorrow") {

    const tomorrow =
      new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    selectedDueDate =
      formatDate(tomorrow);

    selectedTimeHorizon =
      "tomorrow";
  }

  if (option === "week") {

    selectedDueDate = null;

    selectedTimeHorizon =
      "this_week";
  }

  if (option === "none") {

    selectedDueDate = null;

    selectedTimeHorizon =
      "none";
  }

  document
    .querySelectorAll(".due-button")
    .forEach(button => {
      button.classList.remove("selected");
    });

  const selectedButton =
    document.querySelector(
      `.due-button[data-due="${option}"]`
    );

  if (selectedButton) {

    selectedButton.classList.add(
      "selected"
    );
  }
}


async function addNewTask() {

  const input =
    document.getElementById(
      "task-title-input"
    );

  const title =
    input.value.trim();

  if (!title) {

    alert(
      "Tell me what needs to get done first."
    );

    input.focus();

    return;
  }

  if (!selectedTimeHorizon) {

    alert(
      "Choose when this needs to be done."
    );

    return;
  }

  try {

    await callSupabase(
      "add_task",
      {
        p_user_id: USER_ID,
        p_title: title,
        p_due_date: selectedDueDate,
        p_time_horizon:
          selectedTimeHorizon
      }
    );

    closeAddModal();

    await getNextTask();

  } catch (error) {

    console.error(
      "ADD TASK ERROR:",
      error
    );

    alert(
      "I couldn't add that task: " +
      error.message
    );
  }
}


// =========================
// UPCOMING TASKS
// =========================

async function loadUpcomingTasks() {

  const list =
    document.getElementById(
      "upcoming-list"
    );

  list.innerHTML =
    "<p>Loading...</p>";

  try {

    const tasks =
      await callSupabase(
        "get_upcoming_tasks",
        {
          p_user_id: USER_ID
        }
      );

    if (!tasks || tasks.length === 0) {

      list.innerHTML = `
        <div class="upcoming-empty">
          <p>Nothing coming up.</p>
          <span>You're caught up.</span>
        </div>
      `;

      return;
    }

    const groups = {
      tomorrow: [],
      this_week: [],
      none: []
    };

    tasks.forEach(task => {

      if (groups[task.time_horizon]) {

        groups[
          task.time_horizon
        ].push(task);
      }

    });

    let html = "";


    if (groups.tomorrow.length > 0) {

      html += `
        <div class="upcoming-group">
          <h3>Tomorrow</h3>
      `;

      groups.tomorrow.forEach(task => {

        html += `
          <div class="upcoming-task">
            <span>${task.title}</span>
          </div>
        `;

      });

      html += `</div>`;
    }


    if (groups.this_week.length > 0) {

      html += `
        <div class="upcoming-group">
          <h3>This Week</h3>
      `;

      groups.this_week.forEach(task => {

        html += `
          <div class="upcoming-task">
            <span>${task.title}</span>
          </div>
        `;

      });

      html += `</div>`;
    }


    if (groups.none.length > 0) {

      html += `
        <div class="upcoming-group">
          <h3>No Deadline</h3>
      `;

      groups.none.forEach(task => {

        html += `
          <div class="upcoming-task">
            <span>${task.title}</span>
          </div>
        `;

      });

      html += `</div>`;
    }

    list.innerHTML = html;

  } catch (error) {

    console.error(
      "UPCOMING ERROR:",
      error
    );

    list.innerHTML = `
      <div class="upcoming-empty">
        <p>Couldn't load upcoming tasks.</p>
        <span>Please try again.</span>
      </div>
    `;
  }
}


// =========================
// ROUTINES
// =========================

async function loadRoutines() {
  const list = document.getElementById("routines-list");
  list.innerHTML = "<p>Loading...</p>";

  try {
    const routines = await callSupabase(
      "get_recurring_tasks",
      { p_user_id: USER_ID }
    );

    console.log("ROUTINES RESULT:", routines);

    if (!routines || routines.length === 0) {
      list.innerHTML = `
        <div class="upcoming-empty">
          <p>Nothing here yet.</p>
          <span>
            Life Manager isn't keeping up
            with anything yet.
          </span>
        </div>
      `;
      return;
    }

    let html = "";

    routines.forEach(routine => {
      let frequencyText = "";

      if (routine.frequency === "daily") {
        frequencyText = "Every day";
      } else if (routine.frequency === "weekly") {
        frequencyText = "Every week";
      } else if (routine.frequency === "monthly") {
        frequencyText = "Every month";
      } else if (routine.frequency === "yearly") {
        frequencyText = "Every year";
      } else if (routine.frequency === "custom") {
        frequencyText = `Every ${routine.interval_value} days`;
      } else {
        frequencyText = "Custom schedule";
      }

      let durationText = "";

      if (routine.duration_minutes === 60) {
        durationText = "About 1 hour";
      } else if (routine.duration_minutes > 60) {
        durationText = "About a while";
      } else {
        durationText = `About ${routine.duration_minutes} min`;
      }

      const nextDue = new Date(routine.next_due_at);

      const nextDueText = nextDue.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric"
      });

      html += `
  <div
   <div
  class="upcoming-task routine-card"
  data-routine-id="${routine.recurring_id}"
>
  <strong>${routine.title}</strong>

  <div>${frequencyText} · ${durationText}</div>

  <div>Next: ${nextDueText}</div>

  ${
    routine.active
      ? ""
      : `<div class="routine-paused">PAUSED</div>`
  }
</div>
`;
    });

    list.innerHTML = html;
    document.querySelectorAll(".routine-card").forEach(card => {
      card.addEventListener("click", () => {

        const routineId =
          card.dataset.routineId;

        const routine =
          routines.find(
            item =>
              item.recurring_id === routineId
          );

        if (!routine) {
          return;
        }
currentRoutine = routine;
        document
          .getElementById("manage-routine-title")
          .textContent = routine.title;
const pauseButton =
  document.getElementById(
    "pause-routine-button"
  );

pauseButton.textContent =
  routine.active
    ? "Pause Routine"
    : "Resume Routine";
        document
          .getElementById("manage-routine-details")
          .textContent =
            `Every ${routine.interval_value} days · About ${routine.duration_minutes} min`;

        document
          .getElementById("routines-view")
          .classList.add("hidden");

        document
          .getElementById("routine-management-view")
          .classList.remove("hidden");

      });
    });

  } catch (error) {

    console.error(
      "ROUTINES ERROR:",
      error
    );

    list.innerHTML = `
      <div class="upcoming-empty">
        <p>Couldn't load routines.</p>
        <span>${error.message}</span>
      </div>
    `;

  }
}
// =========================
// NAVIGATION
// =========================

const todayTab =
  document.getElementById(
    "today-tab"
  );

const upcomingTab =
  document.getElementById(
    "upcoming-tab"
  );

const routinesTab =
  document.getElementById(
    "routines-tab"
  );

const upcomingView =
  document.getElementById(
    "upcoming-view"
  );

const routinesView =
  document.getElementById(
    "routines-view"
  );

const pageTitle =
  document.getElementById(
    "page-title"
  );


todayTab.addEventListener(
  "click",
  () => {

    todayTab.classList.add(
      "active"
    );

    upcomingTab.classList.remove(
      "active"
    );

    routinesTab.classList.remove(
      "active"
    );

    document
      .querySelector(".task-card")
      .classList.remove(
        "hidden"
      );

    document
      .querySelector(".add-button")
      .classList.remove(
        "hidden"
      );

    upcomingView.classList.add(
      "hidden"
    );

    routinesView.classList.add(
      "hidden"
    );

    pageTitle.textContent =
      "What should I do?";
  }
);


upcomingTab.addEventListener(
  "click",
  async () => {

    upcomingTab.classList.add(
      "active"
    );

    todayTab.classList.remove(
      "active"
    );

    routinesTab.classList.remove(
      "active"
    );

    document
      .querySelector(".task-card")
      .classList.add(
        "hidden"
      );

    document
      .querySelector(".add-button")
      .classList.add(
        "hidden"
      );

    upcomingView.classList.remove(
      "hidden"
    );

    routinesView.classList.add(
      "hidden"
    );

    pageTitle.textContent =
      "What's coming up";

    await loadUpcomingTasks();
  }
);


routinesTab.addEventListener(
  "click",
  async () => {

    routinesTab.classList.add(
      "active"
    );

    todayTab.classList.remove(
      "active"
    );

    upcomingTab.classList.remove(
      "active"
    );

    document
      .querySelector(".task-card")
      .classList.add(
        "hidden"
      );

    document
      .querySelector(".add-button")
      .classList.add(
        "hidden"
      );

    upcomingView.classList.add(
      "hidden"
    );

    routinesView.classList.remove(
      "hidden"
    );

    pageTitle.textContent =
      "Routines";

    await loadRoutines();
  }
);

// =========================
// BACK TO TODAY
// =========================

document
  .getElementById(
    "back-to-today"
  )
  .addEventListener(
    "click",
    () => {

      todayTab.click();

    }
  );

// =========================
// TIME BUTTONS
// =========================
// =========================
// EDIT ROUTINE
// =========================

document
  .getElementById(
    "edit-routine-button"
  )
  .addEventListener(
    "click",
    () => {

      if (!currentRoutine) {
        return;
      }

      const frequency =
        currentRoutine.frequency;

      const duration =
        currentRoutine.duration_minutes;

      const interval =
        currentRoutine.interval_value;

      const frequencyButton =
        document.querySelector(
          `.routine-frequency-button[data-frequency="${frequency}"]`
        );

      const timeButton =
        document.querySelector(
          `.routine-time-button[data-minutes="${duration}"]`
        );

      if (frequencyButton) {
        frequencyButton.classList.add(
          "selected"
        );
      }

      if (timeButton) {
        timeButton.classList.add(
          "selected"
        );
      }

      const intervalInput =
        document.getElementById(
          "routine-interval-input"
        );

      if (frequency === "custom") {

        intervalInput.value =
          interval || "";

        intervalInput.classList.remove(
          "hidden"
        );

      } else {

        intervalInput.value = "";

        intervalInput.classList.add(
          "hidden"
        );

      }

      document
        .getElementById(
          "routine-modal"
        )
        .classList.remove(
          "hidden"
        );

    }
  );
// =========================
// PAUSE / RESUME ROUTINE
// =========================

document
  .getElementById("pause-routine-button")
  .addEventListener(
    "click",
    async () => {

      if (!currentRoutine) {
        return;
      }

      const isPaused =
        currentRoutine.active === false;

      const actionText =
        isPaused
          ? "resume"
          : "pause";

      const confirmed =
        confirm(
          `${isPaused ? "Resume" : "Pause"} "${currentRoutine.title}"?`
        );

      if (!confirmed) {
        return;
      }

      try {

        if (isPaused) {

          await callSupabase(
            "resume_recurring_task",
            {
              p_user_id: USER_ID,
              p_recurring_id:
                currentRoutine.recurring_id
            }
          );

        } else {

          await callSupabase(
            "pause_recurring_task",
            {
              p_user_id: USER_ID,
              p_recurring_id:
                currentRoutine.recurring_id
            }
          );

        }

        currentRoutine = null;

        document
          .getElementById(
            "routine-management-view"
          )
          .classList.add("hidden");

        document
          .getElementById(
            "routines-view"
          )
          .classList.remove("hidden");

        pageTitle.textContent =
          "Routines";

        routinesTab.classList.add("active");
        todayTab.classList.remove("active");
        upcomingTab.classList.remove("active");

        await loadRoutines();

      } catch (error) {

        console.error(
          `${actionText.toUpperCase()} ROUTINE ERROR:`,
          error
        );

        alert(
          `Couldn't ${actionText} this routine: ` +
          error.message
        );

      }

    }
  );
// =========================
// DELETE ROUTINE
// =========================

document
  .getElementById("delete-routine-button")
  .addEventListener(
    "click",
    async () => {

      if (!currentRoutine) {
        return;
      }

      const confirmed =
        confirm(
          `Delete "${currentRoutine.title}"? This cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {

        await callSupabase(
          "delete_recurring_task",
          {
            p_user_id: USER_ID,
            p_recurring_id:
              currentRoutine.recurring_id
          }
        );

        currentRoutine = null;

        document
          .getElementById(
            "routine-management-view"
          )
          .classList.add("hidden");

        document
          .getElementById(
            "routines-view"
          )
          .classList.remove("hidden");

        pageTitle.textContent =
          "Routines";

        routinesTab.classList.add("active");
        todayTab.classList.remove("active");
        upcomingTab.classList.remove("active");

        await loadRoutines();

      } catch (error) {

        console.error(
          "DELETE ROUTINE ERROR:",
          error
        );

        alert(
          "Couldn't delete this routine: " +
          error.message
        );

      }

    }
  );
// =========================
// BACK TO ROUTINES
// =========================

document
  .getElementById(
    "back-to-routines"
  )
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "routine-management-view"
        )
        .classList.add("hidden");

      document
        .getElementById(
          "routines-view"
        )
        .classList.remove("hidden");

      pageTitle.textContent =
        "Routines";

      routinesTab.classList.add("active");
      todayTab.classList.remove("active");
      upcomingTab.classList.remove("active");

      loadRoutines();

    }
  );


// =========================
// TIME BUTTONS
// =========================

// =========================
// TIME BUTTONS
// =========================

document
  .querySelectorAll(".time-button")
  .forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        document
          .querySelectorAll(
            ".time-button"
          )
          .forEach(otherButton => {

            otherButton.classList.remove(
              "selected"
            );

          });

        button.classList.add(
          "selected"
        );

        selectedAvailableMinutes =
          Number(
            button.dataset.minutes
          );

        console.log(
          "Available minutes:",
          selectedAvailableMinutes
        );

        await getNextTask();
      }
    );

  });


// =========================
// ENERGY BUTTONS
// =========================

document
  .querySelectorAll(".energy-button")
  .forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        document
          .querySelectorAll(
            ".energy-button"
          )
          .forEach(otherButton => {

            otherButton.classList.remove(
              "selected"
            );

          });

        button.classList.add(
          "selected"
        );

        selectedEnergyLevel =
          button.dataset.energy;

        console.log(
          "Energy level:",
          selectedEnergyLevel
        );

        await getNextTask();
      }
    );

  });


// =========================
// BUTTON CONNECTIONS
// =========================

document
  .getElementById("done-button")
  .addEventListener(
    "click",
    completeCurrentTask
  );


document
  .getElementById("skip-button")
  .addEventListener(
    "click",
    openSkipModal
  );


document
  .getElementById("cancel-skip")
  .addEventListener(
    "click",
    closeSkipModal
  );


document
  .querySelectorAll(".reason-button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const reason =
          button.dataset.reason;

        skipCurrentTask(reason);
      }
    );

  });


document
  .getElementById("add-button")
  .addEventListener(
    "click",
    openAddModal
  );


document
  .getElementById("cancel-add")
  .addEventListener(
    "click",
    closeAddModal
  );


document
  .getElementById("save-task-button")
  .addEventListener(
    "click",
    addNewTask
  );


document
  .querySelectorAll(".due-button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        chooseDueDate(
          button.dataset.due
        );

      }
    );

  });

// =========================
// START
// =========================

document
  .getElementById("add-routine-button")
  .addEventListener("click", () => {

    currentRoutine = null;

    document
      .getElementById("routine-title-input")
      .value = "";

    document
      .getElementById("routine-interval-input")
      .value = "";

    document
      .querySelectorAll(".routine-frequency-button")
      .forEach(button => {
        button.classList.remove("selected");
      });

    document
      .querySelectorAll(".routine-time-button")
      .forEach(button => {
        button.classList.remove("selected");
      });

    document
      .getElementById("routine-interval-input")
      .classList.add("hidden");

    document
      .getElementById("routine-modal")
      .classList.remove("hidden");

  });

document
  .getElementById("cancel-routine")
  .addEventListener("click", () => {

    document
      .getElementById("routine-modal")
      .classList.add("hidden");

  });


document
  .querySelectorAll(".routine-frequency-button")
  .forEach(button => {

    button.addEventListener("click", () => {

      document
        .querySelectorAll(".routine-frequency-button")
        .forEach(btn =>
          btn.classList.remove("selected")
        );

      button.classList.add("selected");

      const frequency =
        button.dataset.frequency;

      const intervalInput =
        document.getElementById(
          "routine-interval-input"
        );

      if (frequency === "custom") {

        intervalInput.classList.remove(
          "hidden"
        );

        intervalInput.focus();

      } else {

        intervalInput.classList.add(
          "hidden"
        );

        intervalInput.value = "";

      }

    });

  });


document
  .querySelectorAll(".routine-time-button")
  .forEach(button => {

    button.addEventListener("click", () => {

      document
        .querySelectorAll(".routine-time-button")
        .forEach(btn =>
          btn.classList.remove("selected")
        );

      button.classList.add("selected");

    });

  });


// =========================
// SAVE ROUTINE
// =========================

document
  .getElementById("save-routine-button")
  .addEventListener(
    "click",
    async () => {

      const titleInput =
        document.getElementById(
          "routine-title-input"
        );

      const selectedFrequency =
        document.querySelector(
          ".routine-frequency-button.selected"
        );

      const intervalInput =
        document.getElementById(
          "routine-interval-input"
        );

      const selectedTime =
        document.querySelector(
          ".routine-time-button.selected"
        );

      const title =
        titleInput.value.trim();

      // A new routine needs a title.
      // An existing routine already has one.
      if (!title && !currentRoutine) {

        alert(
          "Tell me what you want Life Manager to keep up with."
        );

        titleInput.focus();

        return;
      }

      if (!selectedFrequency) {

        alert(
          "Choose how often this should happen."
        );

        return;
      }

      if (!selectedTime) {

        alert(
          "Choose about how long this usually takes."
        );

        return;
      }

      const frequency =
        selectedFrequency.dataset.frequency;

      const durationMinutes =
        parseInt(
          selectedTime.dataset.minutes,
          10
        );

      let intervalValue = null;

      if (frequency === "custom") {

        intervalValue =
          parseInt(
            intervalInput.value,
            10
          );

        if (
          !intervalValue ||
          intervalValue < 1
        ) {

          alert(
            "Enter the number of days."
          );

          intervalInput.focus();

          return;
        }
      }

      try {

        // EDIT EXISTING ROUTINE
        if (currentRoutine) {

          await callSupabase(
            "update_recurring_task",
            {
              p_user_id: USER_ID,
              p_recurring_id:
                currentRoutine.recurring_id,
              p_frequency: frequency,
              p_interval_value:
                intervalValue,
              p_duration_minutes:
                durationMinutes
            }
          );

        }

        // ADD NEW ROUTINE
        else {

          await callSupabase(
            "add_recurring_task",
            {
              p_user_id: USER_ID,
              p_title: title,
              p_frequency: frequency,
              p_interval_value:
                intervalValue,
              p_duration_minutes:
                durationMinutes
            }
          );

        }

        currentRoutine = null;

        titleInput.value = "";
        intervalInput.value = "";

        document
          .querySelectorAll(
            ".routine-frequency-button"
          )
          .forEach(btn =>
            btn.classList.remove(
              "selected"
            )
          );

        document
          .querySelectorAll(
            ".routine-time-button"
          )
          .forEach(btn =>
            btn.classList.remove(
              "selected"
            )
          );

        intervalInput.classList.add(
          "hidden"
        );

        document
          .getElementById(
            "routine-modal"
          )
          .classList.add(
            "hidden"
          );

        await loadRoutines();

      } catch (error) {

        console.error(
          "SAVE ROUTINE ERROR:",
          error
        );

        alert(
          "Couldn't save this routine: " +
          error.message
        );

      }

    }
  );

getNextTask();

