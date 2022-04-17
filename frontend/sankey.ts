/**
 * Copyright 2018–2020 Observable, Inc.
 * Copyright 2018 Mike Bostock
 * Copyright 2020 Fabian Iwand
 * Copyright 2022 Andreas Gerstmayr <andreas@gerstmayr.me>
 *
 * https://observablehq.com/@d3/sankey
 * https://gist.github.com/mootari/8d3eeb938fafbdf43cda77fe23642d00
 */
import * as d3Base from "d3";
import * as d3Sankey from "d3-sankey";
import { SankeyExtraProperties } from "d3-sankey";
const d3 = Object.assign(d3Base, d3Sankey);

interface SankeyNodeProperties extends SankeyExtraProperties {
  name: string;
}

export function sankeyChart(options) {
  const element = document.getElementById(options.element_id);
  let data = options.data;
  const width = element.clientWidth;
  const height = element.clientHeight;
  const align = options.align;
  const edgeColor = "path";

  if (options.interval === "monthly") {
    data = JSON.parse(JSON.stringify(data));
    for (const link of data.links) {
      link.value = (link.value / data.days) * (365 / 12);
    }
  }

  const color = (() => {
    /*const col = (specifier) => {
      var n = (specifier.length / 6) | 0,
        colors = new Array(n),
        i = 0;
      while (i < n) colors[i] = "#" + specifier.slice(i * 6, ++i * 6);
      return colors;
    };

    const schemeCategory20c = col("3182bd6baed69ecae1c6dbefe6550dfd8d3cfdae6bfdd0a231a35474c476a1d99bc7e9c0756bb19e9ac8bcbddcdadaeb636363969696bdbdbdd9d9d9");
    const color = d3.scaleOrdinal(schemeCategory20c);*/
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    return (d) => color(d.category === undefined ? d.name : d.category);
  })();

  const format = (() => {
    const format = d3.format(",.0f");
    return data.units ? (d) => `${format(d)} ${data.units}` : format;
  })();

  const sankey = (() => {
    const sankey = d3
      .sankey<SankeyNodeProperties, SankeyExtraProperties>()
      .nodeId((d) => d.name)
      .nodeAlign(d3[`sankey${align[0].toUpperCase()}${align.slice(1)}`])
      .nodeWidth(15)
      .nodePadding(10)
      .extent([
        [1, 5],
        [width - 1, height - 5],
      ]);
    return ({ nodes, links }) =>
      sankey({
        nodes: nodes.map((d) => Object.assign({}, d)),
        links: links.map((d) => Object.assign({}, d)),
      });
  })();

  const chart = (() => {
    const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);

    const { nodes, links } = sankey(data);

    svg
      .append("g")
      .attr("stroke", "#000")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("fill", color)
      .append("title")
      .text((d) => `${d.name}: ${format(d.value)}`);

    const link = svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
      .selectAll("g")
      .data(links)
      .join("g")
      .style("mix-blend-mode", "multiply");

    if (edgeColor === "path") {
      const gradient = link
        .append("linearGradient")
        .attr("id", (d, i) => (d.uid = `link-${i}`))
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", (d) => d.source.x1)
        .attr("x2", (d) => d.target.x0);

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", (d) => color(d.source));

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", (d) => color(d.target));
    }

    link
      .append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", (d) =>
        edgeColor === "none"
          ? "#aaa"
          : edgeColor === "path"
          ? `url(#${d.uid})`
          : edgeColor === "input"
          ? color(d.source)
          : color(d.target)
      )
      .attr("stroke-width", (d) => Math.max(1, d.width));

    link.append("title").text((d) => `${d.source.name} → ${d.target.name}: ${format(d.value)}`);

    svg
      .append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
      .text((d) => `${d.name.split(":").pop()}: ${format(d.value)}`)
      .on("click", (e, node) => {
        if (node.link) window.location.assign(node.link);
      });

    return svg.node();
  })();

  element.replaceChildren(chart);
}
