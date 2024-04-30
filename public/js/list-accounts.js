let currentDeletedUser = -1;
function deleteUserPopUp(id, fullname) {
  document.getElementById('delete-pop-up-label').innerHTML = deleteText + fullname
  currentDeletedUser = id
}

const deleteButton = document.getElementById('delete-button')

deleteButton.addEventListener('click', function confirmUserDelete(e) {
  deleteAccountXHR(currentDeletedUser).then((data) => {
    let type
    if (Array.isArray(data)) {
      let interval = 0
      data.forEach((element) => {
        if (element.status_code >= 400) {
          type = 'danger'
        } else if (element.status_code == 200) {
          type = 'success'
          document.getElementById(currentDeletedUser).remove()
        }
        setTimeout(() => {
          notifier.show(element.title, element.status_message, type, "", 3000)
        }, interval)
        interval += 1000
      })
    } else {
      if (data.status_code >= 400) {
        type = 'danger'
      } else if (data.status_code == 200) {
        type = 'success'
        document.getElementById(currentDeletedUser).remove()
      }
      notifier.show(data.title, data.status_message, type || 'info', "", 3000)
    }
  })
})
