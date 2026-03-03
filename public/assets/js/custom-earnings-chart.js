/*=================================
    earnings chart js start
===================================*/
var optionsEarnings = {
  labels: [
    "Cleaning   35%",
    "Ac Repair  25%",
    "Painting   20%",
    "Carpenter   18%",
    "Salon   12%",
  ],

  colors: ["#F58218", "#F79B46", "#FFBC80", "#FDD5AC", "#F5E4D3"],
  series: [30, 20, 20, 18, 12],
  chart: {
    type: "donut",
    height: 500,
    borderRadius: 15,
  },
  dataLabels: {
    enabled: true,
    show: true,
  },

  legend: {
    position: "bottom",
    fontSize: "14px",
    verticalAlign: "center",
    horizontalAlign: "left",
    fontFamily: "DM Sans",
    fontWeight: 500,

    markers: {
      width: 15,
      height: 5,
      offsetX: -5,
    },
  },

  dataLabels: {
    enabled: false,
  },

  plotOptions: {
    pie: {
      expandOnClick: false,
      donut: {
        size: "80%",
        radius: 30,
        labels: {
          show: true,
          name: {
            offsetY: -2,
          },
          value: {
            offsetY: 10,
          },

          total: {
            show: true,
            fontSize: "14px",
            fontFamily: "DM Sans",
            fontWeight: 500,
            label: "Category wise earnings",
          },
        },
      },
      customScale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    bar: {
      borderRadius: 30,
      borderRadiusApplication: "around",
    },
  },

  states: {
    normal: {
      filter: {
        type: "none",
      },
    },
    hover: {
      filter: {
        type: "none",
      },
    },
    active: {
      allowMultipleDataPointsSelection: false,
      filter: {
        type: "none",
      },
    },
  },

  responsive: [
    {
      breakpoint: 320,
      chart: {
        height: 400,
      },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: "80%",
            labels: {
              show: false,
              name: {
                offsetY: -2,
              },
              value: {
                offsetY: -5,
              },

              total: {
                show: true,
                fontSize: "12px",
                fontWeight: 500,
              },
            },
          },
          customScale: 1,
          offsetX: 0,
          offsetY: 0,
        },
        legend: {
          position: "right",
          fontSize: "12px",
          verticalAlign: "center",
          horizontalAlign: "center",
          fontFamily: "DM Sans",
          fontWeight: 500,
          labels: {
            colors: ["#00162E"],
          },
        },
      },
    },
  ],
};

var chartEarnings = new ApexCharts(
  document.querySelector("#earning"),
  optionsEarnings
);
chartEarnings.render();
