import * as echarts from "echarts";

function getCurrencyFormatter(currency: string) {
  const currencyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
  });
  return (value: any) => {
    return currencyFormat.format(value);
  };
}

export function monthlyPnLChart(elementId: string, currency: string, data: any) {
  const chartDom = document.getElementById(elementId);
  const chart = echarts.init(chartDom);
  const currencyFormatter = getCurrencyFormatter(currency);

  const series = data["series"].map((series: any) => ({
    type: "bar",
    ...series,
  }));
  const option: echarts.EChartsOption = {
    title: {
      left: "center",
      text: "Monthly PnL",
    },
    tooltip: {
      trigger: "item",
      valueFormatter: currencyFormatter,
    },
    legend: {
      left: "right",
      orient: "vertical",
    },
    grid: {
      left: "3%",
      right: "150px",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: data["xaxis"],
    },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: {
        formatter: currencyFormatter,
      },
    },
    series,
  };

  chart.setOption(option);
  chart.on("click", "series.bar", function (params) {
    for (let series of data["series"]) {
      if (series.name === params.seriesName) {
        const date_spl = params.name.split("/");
        const time = date_spl[1] + "-" + date_spl[0];
        if (series.link.indexOf("?") == -1) {
          window.location.assign(series.link + "?time=" + time);
        } else {
          window.location.assign(series.link + "&time=" + time);
        }
        break;
      }
    }
  });
}

// unused
export function sankeyChart(elementId: string, currency: string, data: any) {
  const chartDom = document.getElementById(elementId);
  const chart = echarts.init(chartDom);
  const currencyFormatter = getCurrencyFormatter(currency);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      valueFormatter: currencyFormatter,
    },
    animation: false,
    series: {
      type: "sankey",
      nodeAlign: "left",
      data: data["nodes"],
      links: data["links"],
    },
  };
  chart.setOption(option);
}
