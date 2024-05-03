let checkboxPassword = document.getElementById('checkbox-password')
let checkboxConfirmPassword = document.getElementById('checkbox-confirm-password')

function showPassword(checkbox) {
  let input = checkbox.form.querySelector(checkbox.getAttribute('data-checkbox-pointer'))
  input.type = input.type === 'text' ? 'password' : 'text'
}

checkboxConfirmPassword.addEventListener('click', () => showPassword(checkboxConfirmPassword))
checkboxPassword.addEventListener('click', () => showPassword(checkboxPassword))

let bouncer

function init_bouncer() {
  bouncer = new Bouncer('[data-validate]', {
    disableSubmit: true,
    customValidations: {
      passwordsNotMatch: function (e) {
        // if matchSelector is not null, it is the input we search (confirm password)
        let matchSelector = e.getAttribute('data-bouncer-match')
        let password = e.form.querySelector(matchSelector)

        return matchSelector && password.value !== e.value;
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

let passwordField = document.getElementById('password');

passwordField.addEventListener('input', function () {
  // re evaluate confirm password after password field modification
  bouncer.validate(document.getElementById('confirm-password'))
})

document.addEventListener('bouncerFormInvalid', function (e) {
    window.scrollTo(0, e.detail.errors[0].offsetTop)
  },
  false
)

document.addEventListener('bouncerFormValid', function (e) {
    let formdata = new FormData(form)

    createAccountXHR(formdata.get('email'), formdata.get('password'), formdata.get('confirm-password'), formdata.get('firstname'), formdata.get('lastname')).then((data) => {
      let type
      if (Array.isArray(data)) {
        let interval = 0
        data.forEach((element) => {
          if (element.status_code >= 400) {
            type = 'danger'
          } else if (element.status_code === 200) {
            type = 'success'
          }
          setTimeout(() => {
            notifier.show(element.title, element.status_message, type, '', 3000)
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

async function createAccountXHR(email, password, confirmPassword, firstname, lastname) {
  return fetch(`http://localhost:3333/admin/accounts/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'xmlhttprequest',
    },
    body: JSON.stringify({
      email: email,
      password: password,
      confirmPassword: confirmPassword,
      firstname: firstname,
      lastname: lastname,
    }),
  }).then((response) => {
    return response.json()
  })
}
