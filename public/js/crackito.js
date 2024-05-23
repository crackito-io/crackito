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
