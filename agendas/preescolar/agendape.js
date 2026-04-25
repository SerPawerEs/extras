const inputs = document.querySelectorAll('input')
const selectors = document.querySelectorAll('select')
const btn = document.getElementById('continue')
const errmsg = document.getElementById('error')

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        actualizarDatos()
        root()
    }, 500);
})

inputs.forEach(e => {
    e.addEventListener('change', () => {
        actualizarDatos()
    })
});
selectors.forEach(e => {
    e.addEventListener('change', () => {
        actualizarDatos()
    })
});

let dia_n = ''
let dia_t = ''

let grado = ''

let mes_n = ''
let mes_t = ''

let url = ''

const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function actualizarDatos(){
    grado = document.getElementById('grado').value
    const fecha_c = document.getElementById('fecha').value
    
    let partes = fecha_c.split("-")
    dia_t = dias[new Date(`"${partes[0]}-${partes[1]}-${partes[2]}"`).getDay()]
    
    dia_n = partes.map(Number)[2]
    mes_n = partes[1]
    mes_t = meses[mes_n-1]
    url = `https://www.sagradocorazon.edu.co/agenda/${dia_t}-${dia_n}-de-${mes_t}-${grado}/`
    validate()
}

function validate() {
    if(dia_t && dia_n && mes_t && grado && dia_t != 'sabado' && dia_t != 'domingo'){
        btn.style.display = 'grid'
    }else{
        btn.style.display = 'none'
    }
    if(dia_t == 'sabado' || dia_t == 'domingo'){
        errmsg.innerHTML = 'No hay agendas disponibles los sabados y domingos'
    }else{
        errmsg.innerHTML = 'Completa los campos y pulsa continuar'
    }
}
setTimeout(validate, 1000)
function redirect() {
    window.location.href = url
}

function root(){
    console.log('datos: ', dia_t, dia_n, mes_t, grado, salon, dia_t)
}