/** Carga SweetAlert2 solo cuando se usa (toast / confirmaciones). */
let swalPromise = null

export function loadSweetAlert() {
  if (!swalPromise) {
    swalPromise = import('sweetalert2').then((mod) => mod.default ?? mod)
  }
  return swalPromise
}
