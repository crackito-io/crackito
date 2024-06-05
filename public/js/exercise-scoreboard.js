function completeErrorPopUp(content) {
  document.getElementById('complete-error-content').innerHTML = content
}

function editText(step_name, type) {
  var container = document.getElementById('editable-text' + step_name + '-' + type)
  var textElement = container.querySelector('.text')
  var inputElement = container.querySelector('.edit-input')

  inputElement.value = textElement.textContent
  textElement.classList.add('d-none')
  inputElement.classList.remove('d-none')
  inputElement.focus()
}

function saveText(step_name, type) {
  var container = document.getElementById('editable-text' + step_name + '-' + type)
  var textElement = container.querySelector('.text')
  var inputElement = container.querySelector('.edit-input')

  textElement.textContent = inputElement.value
  inputElement.classList.add('d-none')
  textElement.classList.remove('d-none')

  editTitleDescriptionStepXHR(
    'template2',
    step_name,
    type === 'title' ? inputElement.value : '',
    type === 'description' ? inputElement.value : ''
  ).then((data) => {
    console.log(data)
    if (Array.isArray(data)) {
      let interval = 0
      data.forEach((element) => {
        setTimeout(() => {
          notifier.show(element.title, element.status_message, element.status_code === 200 ? 'success' : 'danger', '', 3000)
        }, interval)
        interval += 1000
      })
    } else {
      notifier.show(data.title, data.status_message, data.status_code === 200 ? 'success' : 'danger', '', 3000)
    }
  })
}
