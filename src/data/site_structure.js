const ProductCategories = [
  {
    "name": "Shadow Boxes",
    "path": "/shadow-boxes",
    "description": "",
  },
  {
    "name": "Lamps",
    "path": "/lamps",
    "description": "",
  },
  {
    "name": "Lithophanes",
    "path": "/lithophanes",
    "description": "",
  },
  {
    "name": "3D Posters",
    "path": "/3d-posters",
    "description": "",
  },
  {
    "name": "Keychains",
    "path": "/keychains",
    "description": "",
  },
  {
    "name":"Toys and Fidgets",
    "path": "/toys-and-fidgets",
    "description": "",
  },
  {
    "name":"Light Boxes",
    "path": "/light-boxes",
    "description": "",
  },
  {
    "name":"",
    "path": "/",
    "description": "",
  }

]

const productnameslug = ""

// const Product : {
// }

const SiteStructure = {
  "home": {
    "name": "Home",
    "path": "/",
    "description": "",
  },
  "products": {
    "name": "Products",
    "path": "/products",
    "description": "",
    "subcategories": ProductCategories
  },
  "privacy": {
    "name": "privacy/terms&conditions",
    "path": "/privacy",
    "discription": "user have to check the agreement of privacy and shipping policies",
  },
  "checkout":{
    "name": "Check Out Page",
    "path": "/checkout",
    "discription": "",
  },
  "Auth":{
    "name": "Signin/Login",
    "path": "/auth/signin",
    "discription": "",
  },
  "Services":{
    "name": " Delivery Tracking ",
    "path": "/order-tracking",
    "discription": "user can track thier orders.",
  },
  "Contact":{
    "name": "Contact Us Page",
    "path": "/checkout",
    "discription": "",
  },
  "productDetails":{
    "name":"details of product",
    "path": `/products/${ProductCategories}/${productnameslug}`,
    "discription":""
  },
  "account":{
    "name": "Account",
    "path":"/account",
    "discription": "Order History, Account details"
  },
  "testimonial":{
    "name": "Account",
    "path":"/account",
    "discription": "Order History, Account details"
  }
}