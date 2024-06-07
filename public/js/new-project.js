document.getElementById('switch-template').addEventListener('change', function () {
  const templateSelect = document.getElementById('template-select')
  templateSelect.disabled = !this.checked
  if (templateSelect.disabled) {
    templateSelect.classList.add('disabled')
  } else {
    templateSelect.classList.remove('disabled')
  }
})

const templateSelect = document.getElementById('template-select');
templateSelect.disabled = !document.getElementById('switch-template').checked;
if (templateSelect.disabled) {
  templateSelect.classList.add('disabled')
}

document.getElementById('switch-date').addEventListener('change', function () {
  const dateInput = document.getElementById('date-project-end')
  dateInput.disabled = !this.checked
  if (dateInput.disabled) {
    dateInput.classList.add('disabled')
  } else {
    dateInput.classList.remove('disabled')
  }
})

const dateInput = document.getElementById('date-project-end')
dateInput.disabled = !document.getElementById('switch-date').checked
if (dateInput.disabled) {
  dateInput.classList.add('disabled')
}

let bouncer

function init_bouncer() {
  bouncer = new Bouncer('[data-validate]', {
    disableSubmit: true,
    customValidations: {
      datetimeLessThanToday: function (e) {
        if (e.getAttribute('id') === 'date-project-end') {
          return new Date(e.value) < new Date()
        }
      },
    },
    messages: MESSAGES,
  })
}

function reset_bouncer() {
  bouncer.destroy()
  init_bouncer()
}

init_bouncer()

let form = document.getElementById('validate-me')

form.addEventListener('reset', function () {
  reset_bouncer()
})

document.addEventListener('bouncerFormInvalid', function (e) {
    window.scrollTo(0, e.detail.errors[0].offsetTop)
  },
  false
)

document.addEventListener('bouncerFormValid', function (e) {
    let formdata = new FormData(form)

    createProjectXHR(formdata.get('name'), formdata.get('description'), formdata.get('template'), formdata.get('date-project-end')).then((data) => {
      let type
      if (Array.isArray(data)) {
        let interval = 0
        data.forEach((element) => {
          setTimeout(() => {
            notifier.show(element.title, element.status_message, element.status_code === 200 ? 'success' : 'danger', '', 3000)
          }, interval)
          interval += 1000
        })
      } else {
        if (data.status_code >= 400) {
          type = 'danger'
          document.getElementById('card-create-user').classList.add('bg-danger-subtle')
          document.getElementById('progress-create-user-outer').style.display = 'flex'
          document.getElementById('progress-create-user-inner').classList.add('bg-danger')
          document.getElementById('progress-create-user-inner').classList.remove('bg-success')
          setTimeout(() => {
            document.getElementById('progress-create-user-inner').classList.add('loading')
          }, 0)
          setTimeout(() => {
            document.getElementById('card-create-user').classList.remove('bg-danger-subtle')
            document.getElementById('progress-create-user-inner').classList.remove('loading')
            document.getElementById('progress-create-user-outer').style.display = 'none'
          }, 4000)
          reset_bouncer()
        } else if (data.status_code === 200) {
          type = 'success'
          document.getElementById('card-create-user').classList.add('bg-success-subtle')
          document.getElementById('progress-create-user-outer').style.display = 'flex'
          document.getElementById('progress-create-user-inner').classList.add('bg-success')
          document.getElementById('progress-create-user-inner').classList.remove('bg-danger')
          setTimeout(() => {
            document.getElementById('progress-create-user-inner').classList.add('loading')
          }, 0)
          setTimeout(() => {
            document.getElementById('card-create-user').classList.remove('bg-success-subtle')
            document.getElementById('progress-create-user-inner').classList.remove('loading')
            document.getElementById('progress-create-user-outer').style.display = 'none'
          }, 2000)
        }
        notifier.show(data.title, data.status_message, type || 'info', '', 3000)
      }
    })
  },
  false
)
