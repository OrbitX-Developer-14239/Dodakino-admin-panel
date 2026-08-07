import React from 'react'

function index() {
  const changeTheme = (value) => {
    localStorage.setItem("theme", value);
    window.dispatchEvent(new Event("themechange"));
  }
  return (
    <div>
      <button onClick={() => changeTheme("light")}>Light</button>
      <button onClick={() => changeTheme("dark")}>Dark</button>
      <button onClick={() => changeTheme("auto")}>Auto</button>
    </div>
  )
}

export default index