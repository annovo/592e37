import React from "react";
import { Box, Badge } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  bubble: {
    backgroundColor: "#007FFF",
    borderRadius: "46%",
    height: 24,
    marginRight: 25,
  },
}));

const UnreadMessages = ({ count }) => {
  const classes = useStyles();

  return (
    <Box className={classes.bubble}>
      <Badge badgeContent={count > 99 ? "99+" : count} color="primary" />
    </Box>
  );
};

export default UnreadMessages;
