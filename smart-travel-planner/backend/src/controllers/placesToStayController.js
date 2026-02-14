const Hotel = require('../models/Hotel');
const Restaurant = require('../models/Restaurant');

exports.getHotels = async (req, res) => {
  try {
    const { destination, minRating, sortBy } = req.query;
    let query = {};

    if (destination) {
      query.destination = destination;
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    let hotels = await Hotel.find(query).populate('destination', 'name city country');

    // Sort
    if (sortBy === 'rating') {
      hotels = hotels.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'price-low') {
      hotels = hotels.sort((a, b) => (a.priceRange?.min || 0) - (b.priceRange?.min || 0));
    } else if (sortBy === 'price-high') {
      hotels = hotels.sort((a, b) => (b.priceRange?.max || 0) - (a.priceRange?.max || 0));
    }

    res.json(hotels);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getRestaurants = async (req, res) => {
  try {
    const { destination, minRating, sortBy } = req.query;
    let query = {};

    if (destination) {
      query.destination = destination;
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    let restaurants = await Restaurant.find(query).populate('destination', 'name city country');

    // Sort
    if (sortBy === 'rating') {
      restaurants = restaurants.sort((a, b) => b.rating - a.rating);
    }

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id).populate('destination');
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    res.json(hotel);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate('destination');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteSavedPlace = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedHotel = await Hotel.findByIdAndDelete(id);
    if (deletedHotel) {
      return res.json({ message: 'Hotel deleted successfully' });
    }

    const deletedRestaurant = await Restaurant.findByIdAndDelete(id);
    if (deletedRestaurant) {
      return res.json({ message: 'Restaurant deleted successfully' });
    }

    return res.status(404).json({ message: 'Place not found' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
