import React from "react";
import { Box, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  bubble: {
    backgroundColor: "#007FFF",
    borderRadius: "46%",
    height: 24,
    marginRight: 17,
  },
  text: {
    fontSize: 12,
    color: "#FFFFFF",
    padding: "3px 8px 0px 8px",
    letterSpacing: -0.17,
  },
}));

const UnreadMessages = ({ count }) => {
  const classes = useStyles();

  return (
    <Box className={classes.bubble}>
      <Typography className={classes.text}>
        {count > 99 ? "99+" : count}
      </Typography>
    </Box>
  );
};

export default UnreadMessages;
