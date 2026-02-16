const calc1 = document.getElementById('calc1')
const calc2 = document.getElementById('calc2')
const calc3 = document.getElementById('calc3')
const calc4 = document.getElementById('calc4')

const option1 = document.getElementById('option1')
const option2 = document.getElementById('option2')
const option3 = document.getElementById('option3')


const proveedor = document.getElementById('proveedor')
const moneda = document.getElementById('moneda')


calc1.addEventListener('input', () => {
    if(calc1.value == ''){
        calc2.value = ''
    }else{
        const recibidos = calc1.value * 0.7
        calc2.value = recibidos.toFixed()
    }
})

calc2.addEventListener('input', () => {
    if(calc2.value == ''){
        calc1.value = ''
    }else{
        const enviados = calc2.value / 0.7
        calc1.value = enviados.toFixed()
    }
})


document.addEventListener('DOMContentLoaded', () => {
    cambioMoneda()
})
moneda.addEventListener('change', () => {
    cambioMoneda()
    calculo3()
})

function cambioMoneda(){
    if(moneda.value == 'COP'){
        option1.value = '75'
        option2.value = '23.5'
        option3.value = '0'
    }else if (moneda.value == 'USD'){
        option1.value = '0.0125'
        option2.value = '0.006'
        option3.value = '0'
    }else if (moneda.value == 'CLP'){
        option1.value = '13.75'
        option2.value = '5.3'
        option3.value = '0'
    }else if (moneda.value == 'BRL'){
        option1.value = '0.075'
        option2.value = '0.033'
        option3.value = '0'
    }else if (moneda.value == 'MXN'){
        option1.value = '0.325'
        option2.value = '0.115'
        option3.value = '0'
    }else if (moneda.value == 'PEN'){
        option1.value = '0.045'
        option2.value = '0.023'
        option3.value = '0'
    }else{
        option1.value = '0'
        option2.value = '0'
        option3.value = '0'
    }
}

function calculo3() {
    if(calc3.value == ''){
        calc4.value = ''
    }else{
        const recibidos = (calc3.value * proveedor.value)
        calc4.value = recibidos.toFixed(1)
    }
}0.1

function calculo4() {
    if(calc4.value == ''){
        calc3.value = ''
    }else{
        const enviados = (calc4.value / proveedor.value)
        calc3.value = enviados.toFixed(1)
    }
}

calc3.addEventListener('input', () => {
    calculo3()
})

calc4.addEventListener('input', () => {
    calculo4()
})

proveedor.addEventListener('change', () => {
    calculo3()
})