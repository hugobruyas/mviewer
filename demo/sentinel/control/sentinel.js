// All images to be displayed
const sentinelLayers = [{
    "value": "AGRICULTURE",
    "input": "Agriculture"
  },
  {
    "value": "TRUE_COLOR",
    "input": "Vraies Couleurs"
  },
  {
    "value": "GEOLOGY",
    "input": "Geologie"
  },
  {
    "value": "SWIR",
    "input": "Swir"
  }
];

// WFS request properties
const WFSrequest = {
  'SERVICE': 'WFS',
  'VERSION': '2.0.0',
  'REQUEST': 'GetFeature',
  'TIME': new Date(),
  'TYPENAMES': "S2.TILE",
  "MAXFEATURES": 200,
  "OUTPUTFORMAT": "application/json",
  'BBOX': '-85609.475158,6342438.846129,-623726.112541,5938851.291686',
  'SRSNAME': 'EPSG:3857'
};
var _availableDates = [];

// Classe qui etend la classe abstraite et decrit le custom Control
class Sentinel extends AdvancedCustomControl {
  // Initialize the Custom Component

  constructor(id) {
    // Initialize CustomControl superClass
    super(id);
    // Data initialised once at the start of the app
    this._storedData = {};

  }
  _formatDate = function (date) {

    var d = date.getDate();

    var m = date.getMonth() + 1;

    var year = date.getFullYear();

    var day = d < 10 ? ("0" + d) : d;

    var month = m < 10 ? ("0" + m) : m;

    var formatedDate = [year, month, day].join("-");

    return formatedDate;

  };
  // Init Calendar
  _initDatePicker(options, date = new Date()) {
    if (options) {
      var datepicker = $(".sentinelDatePicker");
      datepicker.datepicker("destroy");
      /*
      datepicker.datepicker(options).on('changeDate',(e)=>{
        this._createWfsRequest(e.format());
      });
      */
      datepicker.datepicker(options);
      datepicker.datepicker("setDate", date);


    } else {
      console.log("No propreties provided !");
    }
  }
  // Callback to sort the dates of the datepicker
  _processForEachDay(date, parent) {
    date = parent._formatDate(date);
    var cloudCover = document.getElementById("cloud-cover").value;
    var classe = "";
    var foundIndex = _availableDates.findIndex(elem => elem.date === date);
    if (foundIndex >= 0) {
      if (_availableDates[foundIndex].cc > cloudCover) {
        classe = 'selectedDatesUpper';
      } else if (_availableDates[foundIndex].cc < cloudCover) {
        classe = 'selectedDatesLower';
      }
    }

    return {
      classes: classe,
      tooltip: classe !== "" ? "Couverture Nuageuse : " + _availableDates[foundIndex].cc + " %" : false
    };
  }
  // Filter all the data
  _filterWfsData(couverture) {

    _availableDates = [];

    // Remove feature which have more clouds than specified and store their dates
    var selection = this._storedData.filter((feature) => {
      var inrange = feature.properties.cloudCoverPercentage <= parseInt(couverture);
      if (_availableDates.findIndex(elem => elem.date === feature.properties.date) === -1) {
        _availableDates.push({
          "date": feature.properties.date,
          "cc": feature.properties.cloudCoverPercentage
        });
      }
      return inrange;
    });
    return selection;
  }
  // data request
  _createWfsRequest(date, image = "TRUE_COLOR", cloud = 0) {
    var newDate = this._formatDate(date);
    if (date)
      WFSrequest.TIME = newDate;
    $.ajax({
      type: "GET",
      url: "https://services.sentinel-hub.com/ogc/wfs/f6219778-b67d-4107-84c6-56e00a2642e2",
      data: WFSrequest,
      crossDomain: true,
      dataType: "json",
      success: (data) => {
        this._storedData = data.features;
        this._filterWfsData(cloud);
        this._setLayerExtraParameters(newDate, image, cloud);
        this._initDatePicker({
          todayHighlight: true,
          beforeShowDay: (date) => this._processForEachDay(date, this),
          autoclose: true
        }, date);
      }
    });
  }

  _setLayerExtraParameters = function (filter_time, image, cloud_cover) {

    // Update Layer with CustomLayer function

    var _source = mviewer.customLayers.sentinel.layer.getSource();
    mviewer.customLayers.sentinel.requestOnImageChange({
      "maxcc": cloud_cover,
      "TIME": filter_time,
      "LAYERS": image
    });
    if (_source.hasOwnProperty("tileClass")) {

      _source.updateParams({
        'ol3_salt': Math.random()
      });

    }

  };

  // Mandatory - code executed when panel is opened
  init() {

    // Init Sliders
    $("#sentinel-layer-lumos").slider({});
    $("#sentinel-layer-contrast").slider({});

    // Get all inputs
    var imageSelect = $("#image-displayed");
    var cloudInput = $("#cloud-cover");
    var dateInput = $("#shooting-date");
    var applyButton = $("#applyButton");

    // Populate the select input for WMS/WFS request
    sentinelLayers.forEach(elem => {
      imageSelect.append(new Option(elem.input, elem.value));
    });

    // Set select default value
    imageSelect.val("TRUE_COLOR");

    // Set cloudCoverage input default value
    cloudInput.val(0);

    // Click event to apply all the parameters entered in the inputs
    applyButton.on("click", () => {
      let image = imageSelect.val();
      let cloud = cloudInput.val();
      let date = dateInput.datepicker('getDate');

      this._createWfsRequest(date, image, cloud);

    });
    // Init DatePicker
    this._initDatePicker({
      todayHighlight: true,
      beforeShowDay: (date) => this._processForEachDay(date, this),
      autoclose: true
    });
    // Get WFS data and Init datePicker21
    this._createWfsRequest(new Date());
  }
  // Mandatory - code executed when panel is closed
  destroy() {

  }

}
// Create The Swipe CustomControl
new Sentinel("sentinel");