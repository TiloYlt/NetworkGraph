
var control = {
    "layout": "force",
    "calculating": true,
    "isBrush": false,
    "node_text_state": false,
    "link_text_state": false,
    "marker_state": false,
    "setting_state": false,
    "screen_state": false,
    "node_size": 15,
    "special": false,
    "node_charge": -300,
    "link_strength": 0.5,
    "line_type": 0
}
var create_x = null;
var create_y = null;
var width = window.innerWidth
var height = window.innerHeight

var svg = d3.select("#svg");

var brush_svg = svg.append("g")
        .attr("class", "brush_svg")
        .style("display", "none");

const stop_button = d3.select("#stop-button");

var container = d3.select("#container");
var defs_layout = container.append("defs");

// 渐变边框
radial_gradient = defs_layout.append("radialGradient")
    .attr("id", "orange_red")
    .attr("cx", "50%")
    .attr("cy", "50%")
    .attr("r", "50%")
    .attr("fx", "50%")
    .attr("fy", "50%");
radial_gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "blue");
radial_gradient.append("stop")
    .attr("offset", "50%")
    .attr("stop-color", "orange");
radial_gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "red");
let temp_layout = container.append("g")
        .attr("class", "temp-layout");
let link_layout = container.append("g")
        .attr("class", "link-layout");
let text_layout = container.append("g")
        .attr("class", "text-layout");
let node_layout = container.append("g")
        .attr("class", "node-layout");

// 箭头
var marker = container.append("marker")
    .attr("id", "resolved")
    .attr("markerUnits", "userSpaceOnUse")
    .attr("viewBox", "0 -5 10 10")//坐标系的区域
    .attr("refX", control.node_size + 7)//箭头坐标
    .attr("refY", 0)
    .attr("markerWidth", 12)//标识的大小
    .attr("markerHeight", 12)
    .attr("orient", "auto")//绘制方向，可设定为：auto（自动确认方向）和 角度值
    .attr("stroke-width", 2)//箭头宽度
    .append("path")
    .attr("class", "marker-path")
    .attr("d", "M2,0 L0,-3 L9,0 L0,3 M2,0 L0,3")//箭头的路径
    .attr("fill","green") //箭头颜色
    .style("display", "none"); 

var linkForce = d3.forceLink()
    .id(function (link) { return link.id })
    .strength(control.link_strength);

var simulation = d3.forceSimulation()
    .force("link", linkForce)
    .on("end", function() {
        control.calculating = false;
        stop_button.text("重新布局");
    });

// d3.json("static/data/TrumpFamily.json").then(function(data) {
//     restart(data);
// });

restart(data);

support_label.forEach(function(label) {
    defs_layout.append("pattern")
        .attr("id", label)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("image")
        .attr("width", control.node_size * 2)
        .attr("height", control.node_size * 2)
        .attr("xlink:href", "static/image/label/" + label + ".jpg");
})

function restart(data) {
    control.calculating = true;
    stop_button.text("停止布局");
    if (control.layout == "force") {
        linkForce.strength(control.link_strength);
        simulation.alpha(1)
            .alphaDecay(0.002)
            .alphaMin(0.002)
            .force("r", null)
            .force("charge", d3.forceManyBody().strength(control.node_charge).distanceMax(400))
            .force("center", d3.forceCenter((width - 30) / 2, (height - 30) / 2))
            .force("collision", d3.forceCollide(control.node_size));
    }
    else {
        data.nodes.forEach(function(node) {
            node.x = 0;
            node.y = 0;
        })
        linkForce.strength(0);
        simulation.force("charge", d3.forceCollide().radius(control.node_size * 1.5))
            .force("r", d3.forceRadial(300, (width - 30) / 2, (height - 30) / 2))
            .alpha(5)
            .alphaDecay(0.1)
            .alphaMin(0.02);
    }

    simulation.nodes(data.nodes)
        .on("tick", draw)
        .force("link")
        .links(data.links);

    // 连线对象
    let linkElements = link_layout.selectAll("path")
        .data(data.links);
    linkElements.exit().remove();
    linkElements = linkElements.enter()
        .append("path")
        .attr("class", "link")
        .merge(linkElements)
        .attr("id", function( link, i ){ return "link-" + i; })
        .on("mousedown.select-link", selectLink)
        .on("mouseover.hover-link", hoverLink);

    // 连线的文字
    let linkTextElements = text_layout.selectAll("text")
        .data(data.links);
    linkTextElements.exit().remove();
    linkTextElements = linkTextElements.enter()
        .append("text")
        .attr("class", "link-text")
        .style("font-size", 10)
        .merge(linkTextElements)
        .style("display", control.link_text_state == true ? "block" : "none");
    linkTextElements.selectAll("textPath").remove();
    linkTextElements.append("textPath")
        .attr("xlink:href", function (link, i) { return "#link-" + i; })
        .text(function(link) { return link.label; });

    // 节点对象
    let nodeElements = node_layout.selectAll(".node")
        .data(data.nodes);

    nodeElements.exit().remove();
    nodeElementsNew = nodeElements.enter()
        .append("g")
        .attr("class", "node");

    nodeElementsNew.append("circle")
        .attr("r", function () { return control.node_size; })


    nodeElementsNew.append("text")
        .attr("class", "node_text")
        .attr("font-size", 5)
        .attr("dy", ".35em")
        .attr("x", function (node) {
            return textBreaking(d3.select(this), node.name);
        })
        .style("display", control.node_text_state == true ? "block" : "none");
    nodeElements = nodeElements
        .merge(nodeElementsNew)        
        .attr("fill", function(node) {
            if(control.special == true) {
                return (node.label != "undefined" && support_label.indexOf(node.label) > -1) ? "url(#" + node.label + ")" : "url(#default)";
            }
            else {
                return "black";
            }
        })
        .on("mousedown.select-node", selectNode)
        .on("mouseover.hover-link", hoverNode);
    nodeElements.call(d3.drag()
        .on("start", dragstartFn)
        .on("drag", dragFn)
        .on("end", dragendFn));
    simulation.restart();

    function dragstartFn(node) {
        simulation.stop();
        d3.event.sourceEvent.stopPropagation();
    }

    function dragFn(node) {
        nodeElements.filter(function(d) { return d.selected; })
            .each(function (node) {
                node.x += d3.event.dx;
                node.y += d3.event.dy;
                d3.select(this)
                  .attr("transform", "translate(" + node.x + "," + node.y + ")");
            })
        linkElements.attr("d", function(link) { 
            return genLinkPath(link, control.line_type); 
        })
        linkTextElements.attr("dx", function(link) { return getLineTextDx(link) });
    }

    function dragendFn(node) {
        if (!d3.event.sourceEvent.ctrlKey) {
            node.selected = false;
            d3.select(this).classed("selected", false);
        }
    }

    function draw() {
        nodeElements.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        linkElements.attr("d", function(link) { return genLinkPath(link, control.line_type); })
            .attr("marker-end", "url(#resolved)");
        linkTextElements.attr("dx", function(link) { return getLineTextDx(link); });
    }
    // 点击清空所有选中
    svg.on("click", function() {
        if (!d3.event.ctrlKey) {
            d3.selectAll(".selected")
                .classed("selected", false);
            nodeElements.each(function(d) {
                d.selected = false;
            });
        }
    })
        .on("mousedown", function() {
            if (d3.event.which == 3) {
                create_x = d3.event.x;
                create_y = d3.event.y;
            }
        });

    // 新建节点
    function create_node(node) {
        var translate_scale_rotate = getTranslateAndScaleAndRotate();
        node.x = (create_x - translate_scale_rotate.x) / translate_scale_rotate.k;
        node.y = (create_y - translate_scale_rotate.y) / translate_scale_rotate.k;
        data.nodes.push(node);
        restart(data);
    }

    // 定义菜单选项
    var node_menu = [
        [
            {
                text: "展开节点",
                func: function() {
                    // id为节点id
                    var id = Number($(this).attr("id"));
                    let cur_node = d3.select(this).datum()
                    $.post("expand", JSON.stringify({ "node": { "label": cur_node.label, "name": cur_node.name} }), function(cur_data, status){
                        cur_data = JSON.parse(cur_data);
                        cur_data.nodes.forEach(function(cur_node) {
                            let add = true;
                            data.nodes.forEach(function(node) {
                                if (cur_node.id == node.id) {
                                    add = false;
                                }
                            })
                            if(add) { data.nodes.push(cur_node); }
                        })
                        cur_data.links.forEach(function(cur_link) {
                            let add = true;
                            data.nodes.forEach(function(link) {
                                if (cur_link.id == link.id) {
                                    add = false;
                                }
                            })
                            if(add) { data.links.push(cur_link); }
                        })
                        restart(data);
                    });
                }
            },
            {
                text: "收起节点",
                func: function() {
                    // id为节点id
                    var id = Number($(this).attr("id"));
                    let cur_node = d3.select(this).datum()
                }
            },
            {
                text: "创建关系",
                func: function() {
                    let cur_node = d3.select(this).datum();
                    let drag_line = temp_layout.append("line")
                        .attr("stroke", "#00FFFB")
                        .style("stroke-width", 1)
                        .style("opacity", "0")
                        .attr("x1", cur_node.x)
                        .attr("y1", cur_node.y);
                    svg.on("mousemove.add-link", function() {
                        translate_scale_rotate = getTranslateAndScaleAndRotate();
                        scale = translate_scale_rotate.k;
                        drag_line.attr("x2", (d3.event.x - translate_scale_rotate.x) / scale)
                            .attr("y2", (d3.event.y - translate_scale_rotate.y) / scale);
                        drag_line.style("opacity", 1);
                    })
                    nodeElements.selectAll("circle")
                        .classed("cursor-target", true)
                        .on("click.add-link", function(node) {
                            drag_line.attr("x2", node.x)
                                .attr("y2", node.y);
                            let new_data = {"source": cur_node.id, "target": node.id, "label": "test"};
                            data.links.push(new_data);
                            restart(data);
                            drag_line.remove();
                            clearEvents();
                        })
                }
            },
            {
                text: "删除节点",
                func: function() {
                    removeNode(d3.select(this).datum());
                    restart(data);
                }
            }
        ]
    ];

    var link_menu = [
        [
            {
                text: "删除关系",
                func: function() {
                    this.remove();
                    data.links.splice(d3.select(this).datum().index, 1);
                    restart(data);
                }
            }
        ]
    ];

    var create_menu = [
        [
            {
                text: "创建节点",
                func: function() {
                    let attr_table = d3.select("#attr-table")
                        .style("display", "block");
                    let attr_tbody = attr_table.select("tbody");
                    attr_tbody.selectAll("*").remove();
                    attr_tbody.append("tr")
                        .append("td")
                        .text("节点属性设置")
                        .attr("colspan", 2)
                        .style("text-align", "center");
                    var new_data = {};
                    for (let attr in data.nodes[0]) {
                        if (["x", "y", "vx", "vy", "index", "selected", "previouslySelected"].indexOf(attr) > -1) {
                            continue;
                        }
                        else {
                            new_data[attr] = null;
                            let cur_tr = attr_tbody.append("tr");
                            if (attr != "label") {
                                cur_tr.append("td")
                                    .text(attr);
                                cur_tr.append("td")
                                    .append("input")
                                    .attr("id", attr);  
                            }
                            else {
                                cur_tr.append("td")   
                                    .text("label");
                                let select = cur_tr.append("td")
                                    .append("select")
                                    .attr("id", attr);
                                support_label.forEach(function(label) {
                                    select.append("option")
                                        .text(label);
                                })
                            }

                        }
                    }
                    let button_layout = attr_tbody.append("tr")
                        .append("td")
                        .attr("colspan", 2)
                        .append("div");

                    button_layout.append("button")
                        .text("确认")
                        .classed("attr-button", true)
                        .on("click", function() {
                            clearEvents();
                            attr_table.style("display", "none");
                            for (attr in new_data) {
                                new_data[attr] = document.getElementById(attr).value;
                            }
                            create_node(new_data);
                            clearEvents();
                        });
                    button_layout.append("button")
                        .text("取消")
                        .classed("attr-button", true)
                        .on("click", function() {
                            attr_table.style("display", "none");
                        });
                }
            }
        ]
    ]

    // 事件监听方式添加事件绑定
    $(".node").smartMenu(node_menu, {
        name: "node_menu"
    });
    $(".link").smartMenu(link_menu, {
        name: "link_menu"
    });
    $("#svg").smartMenu(create_menu, {
        name: "create_menu"
    });

    function removeNode(node) {
        data.nodes.splice(node.index, 1);
        data.links = data.links.filter(function(link) {
            if (link.source !== node && link.target !== node) {
                return true;
            }
        });
        nodeElements.filter(function(cur_node) {
            if (cur_node == node) {
                return true;
            }
        }).remove();
        linkElements.filter(function(link) {
            if (link.source == node || link.target == node) {
                return true;
            }
        }).remove();
        linkTextElements.filter(function(link) {
            if (link.source == node || link.target == node) {
                return true;
            }
        }).remove();
    }

    // 清除所有临时绑定
    function clearEvents() {
        svg.on("mousemove.add-link", null);
        nodeElements.selectAll("circle")
                .on("click.add-link", null)
                .classed("cursor-target", false);
        temp_layout.selectAll("line").remove();
    }

    // 框选功能
    data.nodes.forEach(function(d) {
        d.selected = false;
        d.previouslySelected = false;
    });

    brushEvent = d3.brush()
        .extent([[0, 0], [width, height]])
        .on("start", brushStarted)
        .on("brush", brushed)
        .on("end", brushEnded);

    brush_svg.call(brushEvent);

    function brushStarted() {
        if (d3.event.sourceEvent.type !== "end") {
            nodeElements.classed("selected", false);
            data.nodes.forEach(function(node) {
                node.selected = false;
            });
        }
    }

    function brushed() {
      if (d3.event.sourceEvent.type !== "end") {
        var selection = d3.event.selection;
        nodeElements.classed("selected", function(d) {
          return d.selected = d.previouslySelected ^
            (selection != null
            && selection[0][0] <= d.x && d.x < selection[1][0]
            && selection[0][1] <= d.y && d.y < selection[1][1]);
        });
      }
    }

    function brushEnded() {
        if (d3.event.selection != null) {
          d3.select(this).call(d3.event.target.move, null);
        }
    }

    // 颜色标记
    d3.selectAll(".color-item")
        .on("click", function() {
            var style_elements = nodeElements.filter(function(d) { return d.selected; })
                .select("circle");
            if (control.special == true) {
                style_elements.style("stroke", d3.select(this).style("background-color"));
            }
            else {
                style_elements.style("fill", d3.select(this).style("background-color"));
            }
        });

    d3.select("#node-color").on("change", function () {
        var style_elements = nodeElements.filter(function(d) { return d.selected; });
        if (control.special == true) {
            style_elements.style("stroke", this.value);
        }
        else {
            style_elements.style("fill", this.value);
        }
    });

    // 选取关联
    d3.select("#select-correlation")
        .on("click", function() {
            selectNodes(0);
        });

    // 选中同级
    d3.select("#select-same-degree")
        .on("click", function() {
            selectNodes(1);
        });

    // 选中子节点
    d3.select("#select-childs")
        .on("click", function() {
            selectNodes(2);
        });

    // 选中父节点
    d3.select("#select-parents")
        .on("click", function() {
            selectNodes(3);
        });

    function selectNodes(type) {
        let selected_nodes = data.nodes.filter(function(node, i) {
            return node.selected;
        });
        let parent_nodes = [];
        if (type == 1) {
            data.links.forEach(function(link, i) {
                if ( selected_nodes.indexOf(link.target) > -1) { 
                    link.source.selected = false;
                    parent_nodes.push(link.source);
                }
            });
        }
        data.links.forEach(function(link, i) {
            // 关联
            if (selected_nodes.indexOf(link.source) > -1 && type == 0) { 
                link.target.selected = true;
            }
            else if (selected_nodes.indexOf(link.target) > -1 && type == 0) { 
                link.source.selected = true;
            }
            // 同级
            else if (parent_nodes.indexOf(link.source) > -1 && type == 1) {
                link.target.selected = true;
            }
            // 子节点
            else if (selected_nodes.indexOf(link.source) > -1 && type == 2) {
                link.target.selected = true;
            }
            // 父节点
            else if (selected_nodes.indexOf(link.target) > -1 && type == 3) {
                link.source.selected = true;
            }
        });
        refreshState();
    }

    // 刷新节点选中状态
    function refreshState() {
        nodeElements.each(function(node) {
            if(node.selected == true) {
                d3.select(this).classed("selected", true);
            }
        });
    }

    // 直线
    d3.select("#straight-line")
        .on("click", function() {
            control.line_type = 0;
            draw();
        })

    // 贝塞尔曲线
    d3.select("#bezier-curves")
        .on("click", function() {
            control.line_type = 1;
            draw();
        })

    // 横折线
    d3.select("#horizontal-broken-line")
        .on("click", function() {
            control.line_type = 2;
            draw();
        })

    // 贝塞尔曲线
    d3.select("#vertical-broken-line")
        .on("click", function() {
            control.line_type = 3;
            draw();
        })

    // 调整图参数
    d3.select("#node-size").on("input propertychange", function() {
        control.node_size = parseFloat(this.value);
        d3.select("marker").attr("refX", control.node_size + 7);
        nodeElements.selectAll("circle").attr("r", control.node_size);
        d3.selectAll("image")
            .attr("width", control.node_size * 2)
            .attr("height", control.node_size * 2);
        simulation.force("collision", d3.forceCollide(control.node_size))
            .alpha(0)
            .restart();
    });

    d3.select("#node-opacity").on("input propertychange", function() {
        let opacity = this.value;
        nodeElements.style("opacity", function(node, i){
            return opacity;
        });
    });      

    d3.select("#node-stroke").on("input propertychange", function() {
        let stroke_width = this.value;
        nodeElements.selectAll("circle").style("stroke-width", function(node, i){
            return stroke_width;
        });
    });

    d3.select("#node-charge").on("input propertychange", function() {
        control.node_charge = - this.value;
        simulation.force("charge", d3.forceManyBody().strength(control.node_charge));
        simulation.alpha(1).restart();
    });

    d3.select("#link-strength").on("input propertychange", function() {
        control.link_strength = parseFloat(this.value);
        simulation.force("link").strength(control.link_strength);
        simulation.alpha(1).restart();
    });

    d3.select("#line-color").on("change", function() {
        d3.selectAll("path").style("stroke", this.value);
    });

    d3.select("#line-stroke-width").on("input propertychange", function() {
        var line_stroke_width = this.value;
        linkElements.style("stroke-width", function(node, i){
            return line_stroke_width;
        });
    });

    // 切换分析模式
    d3.select("#analyse-button")
        .on("click", function() {
            control.special = !control.special;
            d3.select("#analyse-switch").attr("class", control.special == true ? "fa fa-toggle-on" : "fa fa-toggle-off");
            nodeElements.select("circle")
                .style("fill", function(node) {
                    if(control.special == true) {
                        return (node.label != "undefined" && support_label.indexOf(node.label) > -1) ? "url(#" + node.label + ")" : "url(#default)";
                    }
                    else {
                        return "black";
                    }
            });
        })

    // 点击选中节点
    function selectNode(node) {
        d3.select(this).classed("find-node", false);
        if (d3.event.which == 3) {
            simulation.stop();
        }
        node.selected = true;
        d3.select(this).classed("selected", true);
    }

    // 切换布局
    d3.select("#layout-button")
        .on("click", function() {
            control.layout = (control.layout == "force" ? "radius" : "force");
            d3.select("#layout-switch").attr("class", control.layout == "radius" ? "fa fa-toggle-on" : "fa fa-toggle-off");
            restart(data);
        })

    // 导出数据
    d3.select("#download-data")
        .on("click", downFile);

    function downFile() {
        var temp = JSON.parse(JSON.stringify(data));
        temp.nodes.forEach(function(node) {
            delete node.index;
            delete node.x;
            delete node.y;
            delete node.vx;
            delete node.vy;
            delete node.selected;
            delete node.previouslySelected;
        });
        temp.links.forEach(function(link) {
            delete link.index;
            link.source = link.source.id;
            link.target = link.target.id;
        })
        var elementA = document.createElement('a');
        elementA.setAttribute('href', 'data:text/plain;charset=utf-8,' + JSON.stringify(temp, null, 4));
        elementA.setAttribute('download', "data.json");
        elementA.style.display = 'none';
        document.body.appendChild(elementA);
        elementA.click();
        document.body.removeChild(elementA);
    }
}

d3.select("#upload-button")
    .on("click", function() {
        var form_data = new FormData();
        var file_info = $("#file-input")[0].files[0];
        form_data.append("file", file_info);
        $.ajax({
            url: "upload",
            type: "POST",
            data: form_data,
            processData: false,
            contentType: false,
            success: function(data) {
                restart(JSON.parse(data));
                d3.select("#upload-layout")
                    .style("display", "none");
                d3.select("#file-name").text(this.value);
                d3.select("file-state").text("等待上传");
            },
            error: function() {
                alert("数据上传失败！");
            }
        })
    })
// 停止布局
stop_button.on("click", function () {
    if (control.calculating == true) {
        simulation.stop();
        stop_button.text("重新布局");
        control.calculating = false;
    }
    else {
        control.calculating = true;
        stop_button.text("停止布局");
        simulation.restart();
    }
});

// 顺时针旋转
d3.select("#rotate")
    .on("click", function() {
        let translate_scale_rotate = getTranslateAndScaleAndRotate();
        translate_scale_rotate.rotate = parseInt(translate_scale_rotate.rotate) + 10 + '';
        zoomFunction(translate_scale_rotate);
    })

// 逆时针旋转
d3.select("#rerotate")
    .on("click", function() {
        let translate_scale_rotate = getTranslateAndScaleAndRotate();
        translate_scale_rotate.rotate = parseInt(translate_scale_rotate.rotate) - 10 + '';
        zoomFunction(translate_scale_rotate);
    })

// 缩放
var zoom = d3.zoom()
    .on("zoom", function() {
        let translate_scale_rotate = getTranslateAndScaleAndRotate();
        d3.event.transform["rotate"] = translate_scale_rotate.rotate;
        zoomFunction(d3.event.transform);
    });

svg.call(zoom)
    .on("dblclick.zoom", null);

function zoomFunction(vars) {
    container.attr("transform", "translate(" + vars.x + "," + vars.y + ") " + "scale(" + vars.k + ") " + "rotate(" + vars.rotate + ")");
    brush_svg.attr("transform", "translate(" + vars.x + "," + vars.y + ") " + "scale(" + vars.k + ") " + "rotate(" + vars.rotate + ")");
    brush_svg.select("rect")
        .attr("x", -vars.x / vars.k)
        .attr("y", -vars.y / vars.k)
        .attr("width", width / vars.k)
        .attr("height", height / vars.k);
}

d3.select("#zoom-out").on("click", function() {
    let translate_scale_rotate = getTranslateAndScaleAndRotate();
    translate_scale_rotate.k = parseFloat(translate_scale_rotate.k) * 1.5 + '';
    zoomFunction(translate_scale_rotate);    
});      

d3.select("#zoom-in").on("click", function() {
    let translate_scale_rotate = getTranslateAndScaleAndRotate();
    translate_scale_rotate.k = parseFloat(translate_scale_rotate.k) / 1.5 + '';
    zoomFunction(translate_scale_rotate);
});      

d3.select("#zoom-reset").on("click", function() {
    let translate_scale_rotate = getTranslateAndScaleAndRotate();
    translate_scale_rotate.k = "1";
    zoomFunction(translate_scale_rotate);
});

// 框选模式
d3.select("#brush-mode")
    .on("click", function () {
        d3.select(this).classed("high-light", control.isBrush = !control.isBrush);
        brush_svg.style("display", control.isBrush == true ? "block" : "none");
    })

// 节点标签显示开关
d3.select("#node-button").on("click", function() {
    control.node_text_state = !control.node_text_state;
    d3.select("#node-switch").attr("class", control.node_text_state == true ? "fa fa-toggle-on" : "fa fa-toggle-off");
    d3.selectAll(".node text").style("display", control.node_text_state == true ? "block" : "none");
});

// 关系标签显示开关
d3.select("#link-button")
    .on("click", function() {
        control.link_text_state = !control.link_text_state;
        d3.select("#link-switch").attr("class", control.link_text_state == true ? "fa fa-toggle-on" : "fa fa-toggle-off");
        text_layout.selectAll("text").style("display", control.link_text_state == true ? "block" : "none");
    });

// 箭头显示开关
d3.select("#marker-button")
    .on("click", function() {
        control.marker_state = !control.marker_state;
        d3.select("#marker-switch").attr("class", control.marker_state == true ? "fa fa-toggle-on" : "fa fa-toggle-off");
        d3.selectAll(".marker-path").style("display", control.marker_state == true ? "block" : "none");
    });

// 显示设置面板
d3.selectAll("#setting-button")
    .on("click", function() {
        control.setting_state = !control.setting_state;
        d3.select("#setting-box").style("display", control.setting_state == true ? "block" : "none");
    });

// 全屏切换
d3.select("#screen-button")
    .on("click", function() {
        control.screen_state = !control.screen_state;
        d3.select("#screen-switch").attr("class", control.screen_state == true ? "fa fa-compress" : "fa fa-expand");
        control.screen_state == true ? enterFullScreen() : exitFullScreen();
    });

function textBreaking(d3text, text) {
    let len = text.length;
    if (len <= 4) {
        d3text.append("tspan")
            .attr("x", 0)
            .attr("y", 2)
            .text(text);
    } else {
        let top_text = text.substring(0, 4);
        let mid_text = text.substring(4, 9);
        let bot_ext = text.substring(9, len);
        let top_y = -9;
        let mid_y = 2;
        let bot_y = 10;
        if (len <= 10) {
            top_y += 5;
            mid_y += 5;
        } else {
            bot_ext = text.substring(9, 11) + "...";
        }

        d3text.text("");
        d3text.append("tspan")
            .attr("x", 0)
            .attr("y", top_y)
            .text(function () {
                return top_text;
            });
        d3text.append("tspan")
            .attr("x", 0)
            .attr("y", mid_y)
            .text(function () {
                return mid_text;
            });
        d3text.append("tspan")
            .attr("x", 0)
            .attr("y", bot_y)
            .text(function () {
                return bot_ext;
            });
    }
}

// 生成关系连线路径
function genLinkPath(link, line_type) {
    let path = null;
    let temp = 0;
    const sx = link.source.x;
    const sy = link.source.y;
    const tx = link.target.x;
    const ty = link.target.y;
    const dx = (tx - sx) / 8;
    const dy = (ty - sy) / 8;
    const x1 = sx + dx;
    const y1 = sy + dy;
    const x2 = sx + dx * 2;
    const y2 = sy + dy * 2;
    const x3 = sx + dx * 3;
    const y3 = sy + dy * 3;
    const x4 = sx + dx * 4;
    const y4 = sy + dy * 4;
    const x7 = sx + dx * 7;
    const y6 = sy + dy * 6;
    if (line_type == 0) {
        path = "M" + sx + "," + sy + " L" + tx + "," + ty;
    }
    else if (line_type == 1) {
        path = "M " + sx + "," + sy + " C" + x1 + "," + y2 + " " + x2 + "," + y3 + " " + x4 + "," + y4 + " S" + x7 + "," + y6 + " " + tx + "," + ty;
    }
    else if (line_type == 2) {
        path = "M " + sx + "," + sy + " L" + x4 + "," + sy + " " + " L" + x4 + "," + ty + " L" + tx + "," + ty;
    }
    else if (line_type == 3) {
        path = "M " + sx + "," + sy + " L" + sx + "," + y4 + " " + " L" + tx + "," + y4 + " L" + tx + "," + ty;
    }
    return path;
}

function getLineTextDx(link) {
    const sx = link.source.x;
    const sy = link.source.y;
    const tx = link.target.x;
    const ty = link.target.y;
    const distance = Math.sqrt(Math.pow(tx - sx, 2) + Math.pow(ty - sy, 2));
    const text_length = link.label.length;
    const dx = (distance - 3 * text_length) / 2;
    return dx;
}

// 掠过显示节点信息
function hoverNode(node) {
    var node_info = d3.select("#node-info")
        .style("display", "block");
    node_info.selectAll(".info").remove();
    for (var key in node) {
        if (["x", "y", "vx", "vy", "index", "selected", "previouslySelected"].indexOf(key.toString()) != -1) {
            continue;
        }
        node_info.append("p")
            .attr("class", "info")
            .text(key + ": " + node[key]);
    }
}

// 掠过显示关系信息
function hoverLink(link) {
    var link_info = d3.select("#link-info")
        .style("display", "block");
    link_info.selectAll(".info").remove();
    for(var key in link){
        // 可用来排除一些属性
        // if(["x", "y", "vx", "vy", "index", "selected", "previouslySelected"]
        //     .indexOf(item.toString()) != -1) {
        //     continue;
        // }
        var temp = link_info.append("p")
                    .attr("class", "info")
        if (key != "source" && key != "target") {
            temp.text(key + ": " + link[key]);
        }
        else {
            temp.text(key + ": " + link[key]["label"]);
        }                    
    }
}

// 点击选中边
function selectLink(link) {
    link.selected = true;
    d3.select(this).classed("selected", true);
}

// 获取transform
function getTranslateAndScaleAndRotate() {
    const transform = container.attr("transform");
    const match_translate_scale = transform && /translate/.test(transform) && /scale/.test(transform) && transform.match(/translate\(([^\)]+)\)\s?scale\(([^\)]+)/);
    const translate = match_translate_scale && match_translate_scale[1].split(",") || [0, 0];
    const k = match_translate_scale && match_translate_scale[2] || 1;
    const match_rotate = transform && /rotate/.test(transform) && transform.match(/\s?rotate\(([^\)]+)/);
    const rotate = match_rotate && match_rotate[1] || 0;
    const x = translate[0];
    const y = translate[1];
    return {x, y, k, rotate};
}