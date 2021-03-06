const router = require('express').Router()
const faker = require('faker')
const Product = require('../models/product')
const Review = require('../models/review')

router.get('/generate-fake-data', (req, res, next) => {
  for (let i = 0; i < 90; i++) {
    let product = new Product()
    let review = new Review({ text: "This product is awesome!", userName: "Karen Ryan"})

    product.category = faker.commerce.department()
    product.name = faker.commerce.productName()
    product.price = faker.commerce.price()
    product.image = 'https://lallahoriye.com.tirzee.com/wp-content/uploads/2019/04/Product_Lg_Type.jpg'
    product.reviews.push(review)

    product.save((err) => {
      if (err) {
        res.send(err)
      } else {
        review.product = product._id
        review.save()
      }
    })
  }
  res.end()
})


// Get the products and find them by category and sort them by price
router.get('/products', (req, res, next) => {
  const perPage = 9
  // return the first page by default
  const page = req.query.page || 1

  query = {}
  order = {}

  if(req.query.price == 'highest') {
    order.price = 'desc'
  } else if(req.query.price == 'lowest') {
    order.price = 'asc'
  }

  if (req.query.category) { 
    query.category = req.query.category.charAt(0).toUpperCase() + req.query.category.substring(1);
  }

  Product
    .find(query)
    .sort(order)
    .skip((perPage * page) - perPage)
    .limit(perPage)
    .exec((err, products) => {
      // Note that we're not sending `count` back at the moment, but in the future we might want to know how many are coming back
      Product.find(query).count().exec((err, count) => {
        if (err) return next(err)
        
        // Send back the products and the count
        res.send({products: products, count: count})
      })
    })
})

// Get products by product id by finding the id and matching it to the params id
router.get('/products/:product', (req, res, next) => {
  Product.find({ _id: req.params.product}).exec(( err, product) => {
    if(err) {
      res.send(err)}
     else {
       res.send(product)
     }
  })
})

// Get all the reviews 
router.get('/reviews', (req, res, next) => {
  const perPage = 40

  // return the first page by default
  const page = req.query.page || 1

  Review
    .find({})
    .skip((perPage * page) - perPage)
    .limit(perPage)
    .exec((err, reviews) => {
      // Note that we're not sending `count` back at the moment, but in the future we might want to know how many are coming back
      Review.count().exec((err, count) => {
        if (err) return next(err)

        // Send back the reviews and the count
        res.send({reviews: reviews, count: count})
      })
   })
})

// Post a new product to the database 
router.post('/products', (req, res, next) => {

    let product = new Product({
      category: req.body.category,
      name: req.body.name,
      price: req.body.price,
      image: req.body.image,
      reviews: []
  })
  product.save((err) => {
    if (err) {
      res.send(err)
    } else {
      res.send("Product was successfully added.")
    }
  })
})

// Post a new review to the database
router.post('/:product/reviews', (req, res, next) => {

  let review = new Review({
    userName: req.body.userName,
    text: req.body.text,
    product: req.params.product
  })

  Product.findById(req.params.product, function (err, product) { 
      if(err) {
        res.send(err) 
      } else {
        review.save((err, review) => {
          if(err) {
            res.send(err) 
          } else {
            product.reviews.push(review)
            product.save()
            res.send("Review was successfully added.")
          }
        })
      }
    })
  })

  // Delete a product from the database
  router.delete('/products/:product', (req, res, next) => {
    Product.findByIdAndRemove(req.params.product, function (err) {
      if(err) {
        res.send(err)
      } else {
        res.send("Product was successfully removed.")
      }
    })
  })

  // Delete a review from the database
  router.delete('/reviews/:review', (req, res, next) => {
    // Find review by id
    Review.findById(req.params.review)
        // Populate product
        .populate('product')
        .exec((err, review) => {
          if (err) {
            res.send(err)
          } else {
            // If review found then find product by review product id
            Product.findById(review.product.id, function (err, product) {
              if(err) {
                res.send(err)
              } else {
                 // Filter the reviews on the product, return reviews that do not match the review id
                 product.reviews = product.reviews.filter((review) => {
                  return review._id != req.params.review
                })
                  // Save the product
                  product.save()
                  // Find the review by id and remove from the database collection
                  Review.findByIdAndRemove(req.params.review, function (err) {
                    if(err) {
                      res.send(err)
                    } else {
                      res.send("Review was successfully removed.")
                    }
               })
             }
          })
        }
     })    
  })

  // Get products by search
  router.get('/search', (req, res, next) => {
    // Capitalize the first letter in the query 
    let search = req.query.query.charAt(0).toUpperCase() + req.query.query.substring(1);
    // Find the product using a regular expression match
    Product.find({ "name" : { $regex : `.*${search}*.` }}).limit(9).exec(( err, products) => {
      if(err) {
        res.send(err)}
       else {
        // Find the product count using a regular expression 
        Product.find({ "name" : { $regex : `.*${search}*.` }}).count().exec((err, count) => {
          if (err) return next(err)
          // Send back the matching products and count
          res.send({products: products, count: count})
        })
       }
     })
  })


module.exports = router