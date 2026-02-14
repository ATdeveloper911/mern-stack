const Destination = require('../models/Destination');

exports.getPopularDestinations = async (req, res) => {
  try {
    let destinations = await Destination.find({ isPopular: true })
      .limit(6)
      .select('name country city images coordinates');

    if (!destinations || destinations.length === 0) {
      destinations = await Destination.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .select('name country city images coordinates');
    }

    res.json(destinations || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.search = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.json([]);
    }

    const destinations = await Destination.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { city: { $regex: query, $options: 'i' } },
        { country: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);

    res.json(destinations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
