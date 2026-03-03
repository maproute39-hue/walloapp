/*=================================
    revenue chart js start
===================================*/
var options = {
  series: [
    {
      name: "Website Blog",
      type: "column",
      data: [12, 18, 14, 17, 11, 19, 14],
    },
  ],
  chart: {
    height: 300,
    offsetX: -15,
    toolbar: {
      show: false,
    },
  },
  stroke: {
    width: [0, 3],
  },
  grid: {
    show: true,
    borderColor: "rgba(106, 113, 133, 0.30)",
    strokeDashArray: 3,
  },
  dataLabels: {
    enabled: false,
  },

  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: "20%",
      borderRadius: 5,
      borderRadiusApplication: "end",
      borderRadiusWhenStacked: "last",
    },
  },
  colors: ["#F5F6F7"],
  legend: {
    show: false,
  },
  markers: {
    size: [3, 0],
    colors: ["#3D434A"],
    strokeWidth: [0, 0],
  },

  xaxis: {
    categories: ["M", "T", "W", "T", "F", "S", "S"],
    labels: {
      show: true,
      style: {
        fontFamily: "DM Sans",
        fontWeight: 500,
        colors: "#808B97",
      },
    },

    axisBorder: {
      show: false,
    },
  },
  yaxis: {
    tickAmount: 5,
    min: 0,
    max: 25,
    stepSize: 5,
    labels: {
      show: true,
      offsetX: -5,
      style: {
        fontFamily: "DM Sans",
        fontWeight: 500,
        colors: "#808B97",
      },

      formatter: (value) => {
        return `${value}k`;
      },
    },
  },
};

var chart = new ApexCharts(document.querySelector("#revenue-chart"), options);
chart.render();
