async function deleteAccountXHR(id) {
  return fetch(`/admin/api/accounts/${id}`, {
    method: 'DELETE',
    headers: {
      'X-Requested-With': 'xmlhttprequest',
    },
  }).then((response) => {
    return response.json()
  })
}

async function createAccountXHR(email, password, confirmPassword, firstname, lastname) {
  return fetch(`/admin/accounts/`, {
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

async function editTitleDescriptionStepXHR(repo_name, step_name, title, description) {
  return fetch(`/exercises/${repo_name}/scoreboard`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'xmlhttprequest',
    },
    body: JSON.stringify({
      step_name: step_name,
      title: title,
      description: description,
    }),
  }).then((response) => {
    return response.json()
  })
}
